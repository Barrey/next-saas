export interface BillingService {
  createCheckoutSession(organizationId: string, priceId: string, returnUrl: string): Promise<string>;
  createPortalSession(customerId: string, returnUrl: string): Promise<string>;
}

import { StripeBillingService } from "./stripe";

const provider = process.env.BILLING_PROVIDER || "stripe";

export let billingService: BillingService;

if (provider === "stripe") {
  billingService = new StripeBillingService();
} else {
  throw new Error(`Unsupported billing provider: ${provider}`);
}
