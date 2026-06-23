import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { billingService } from "@/lib/billing/billing";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();
    
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, user.organizationId!))
      .limit(1);
      
    if (!sub || !sub.providerCustomerId) {
      return NextResponse.json({ error: "No active subscription customer found." }, { status: 400 });
    }
    
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    const returnUrl = body.returnUrl || `${req.nextUrl.origin}/dashboard/billing`;
    
    const portalUrl = await billingService.createPortalSession(
      sub.providerCustomerId,
      returnUrl
    );
    
    return NextResponse.json({ url: portalUrl });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (err.message === "Forbidden" || err.message === "NoOrganization") {
      return NextResponse.json({ error: "Only the organization owner can manage billing." }, { status: 403 });
    }
    console.error("Billing portal error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
