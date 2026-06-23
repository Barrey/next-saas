import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { billingService } from "@/lib/billing/billing";

export async function POST(req: NextRequest) {
  try {
    const user = await requireOwner();
    
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    const { priceId, returnUrl } = body;
    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required." }, { status: 400 });
    }
    
    const fallbackReturnUrl = returnUrl || `${req.nextUrl.origin}/dashboard/billing`;
    
    const checkoutUrl = await billingService.createCheckoutSession(
      user.organizationId!,
      priceId,
      fallbackReturnUrl
    );
    
    return NextResponse.json({ url: checkoutUrl });
  } catch (err: any) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (err.message === "Forbidden" || err.message === "NoOrganization") {
      return NextResponse.json({ error: "Only the organization owner can manage billing." }, { status: 403 });
    }
    console.error("Billing checkout error:", err);
    return NextResponse.json({ error: "Server error occurred." }, { status: 500 });
  }
}
