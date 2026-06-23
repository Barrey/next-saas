import Stripe from "stripe";
import { BillingService } from "./billing";

export class StripeBillingService implements BillingService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY || "mock_stripe_key";
    this.stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-19" as any,
    });
  }

  async createCheckoutSession(organizationId: string, priceId: string, returnUrl: string): Promise<string> {
    if (process.env.MOCK_DB === "true") {
      return `https://checkout.stripe.com/pay/mock_stripe_key_${priceId}_${organizationId}`;
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      subscription_data: {
        metadata: {
          organizationId,
        },
      },
      metadata: {
        organizationId,
      },
    });

    return session.url || returnUrl;
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    if (process.env.MOCK_DB === "true") {
      return `https://billing.stripe.com/p/session/mock_stripe_key_${customerId}`;
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}
