import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_stripe_key", {
  apiVersion: "2024-12-19" as any,
});

export async function POST(req: NextRequest) {
  let payload: string;
  try {
    payload = await req.text();
  } catch (e) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let event: any;
  const isMock = process.env.MOCK_DB === "true";

  if (isMock) {
    try {
      event = JSON.parse(payload);
    } catch (e) {
      return NextResponse.json({ error: "Invalid mock JSON" }, { status: 400 });
    }
  } else {
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
  }

  try {
    const eventType = event.type;
    const dataObject = event.data.object;

    if (
      eventType === "checkout.session.completed" ||
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated"
    ) {
      let orgId = dataObject.metadata?.organizationId;
      let subId = "";
      let customerId = "";
      let priceId = "";
      let status = "";
      let currentPeriodEnd: Date | null = null;
      let cancelAtPeriodEnd = false;

      if (eventType === "checkout.session.completed") {
        customerId = dataObject.customer as string;
        subId = dataObject.subscription as string;
        status = dataObject.status === "complete" ? "active" : "incomplete";
        
        // Handle mock or embedded subscription payload for Playwright tests
        if (dataObject.subscription && typeof dataObject.subscription !== "string") {
          const subObj = dataObject.subscription;
          status = subObj.status || status;
          priceId = subObj.items?.data?.[0]?.price?.id || "";
          if (subObj.current_period_end) {
            currentPeriodEnd = new Date(subObj.current_period_end * 1000);
          }
          cancelAtPeriodEnd = subObj.cancel_at_period_end || false;
        }
      } else {
        subId = dataObject.id;
        customerId = dataObject.customer as string;
        status = dataObject.status;
        priceId = dataObject.items?.data?.[0]?.price?.id;
        if (dataObject.current_period_end) {
          currentPeriodEnd = new Date(dataObject.current_period_end * 1000);
        }
        cancelAtPeriodEnd = dataObject.cancel_at_period_end || false;
        if (!orgId) {
          orgId = dataObject.metadata?.organizationId;
        }
      }

      if (!orgId && subId) {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.providerSubscriptionId, subId))
          .limit(1);
        if (existing) {
          orgId = existing.organizationId;
        }
      }

      if (!orgId) {
        console.error("Organization ID not found for subscription:", subId);
        return NextResponse.json({ error: "Organization ID not found" }, { status: 400 });
      }

      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, orgId))
        .limit(1);

      if (existingSub) {
        await db
          .update(subscriptions)
          .set({
            provider: "stripe",
            providerCustomerId: customerId || existingSub.providerCustomerId,
            providerSubscriptionId: subId || existingSub.providerSubscriptionId,
            providerPriceId: priceId || existingSub.providerPriceId,
            status: status || existingSub.status,
            currentPeriodEnd: currentPeriodEnd || existingSub.currentPeriodEnd,
            cancelAtPeriodEnd: cancelAtPeriodEnd !== undefined ? cancelAtPeriodEnd : existingSub.cancelAtPeriodEnd,
          })
          .where(eq(subscriptions.organizationId, orgId));
      } else {
        await db.insert(subscriptions).values({
          organizationId: orgId,
          provider: "stripe",
          providerCustomerId: customerId,
          providerSubscriptionId: subId,
          providerPriceId: priceId,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        });
      }
    } else if (eventType === "customer.subscription.deleted") {
      const subId = dataObject.id;
      let orgId = dataObject.metadata?.organizationId;

      if (!orgId && subId) {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.providerSubscriptionId, subId))
          .limit(1);
        if (existing) {
          orgId = existing.organizationId;
        }
      }

      if (orgId) {
        await db
          .update(subscriptions)
          .set({
            status: "canceled",
            cancelAtPeriodEnd: false,
          })
          .where(eq(subscriptions.organizationId, orgId));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook event handling error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
