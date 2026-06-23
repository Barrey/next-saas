"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ShieldAlert, Sparkles, Zap, ArrowRight, Settings } from "lucide-react";

interface BillingDashboardClientProps {
  user: {
    id: string;
    email: string;
    role: string | null;
    organizationId: string | null;
  };
  subscription: {
    id: string;
    provider: string;
    providerSubscriptionId: string | null;
    providerPriceId: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean | null;
  } | null;
}

const PLANS = [
  {
    id: "free",
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Essential tools for small projects and side hustles.",
    features: [
      "Up to 3 team members",
      "Basic AI route planner",
      "5 searches per day",
      "Community support",
    ],
    priceId: null,
  },
  {
    id: "pro",
    name: "Pro Professional",
    price: "$29",
    period: "month",
    description: "Complete power-pack for growing organizations.",
    features: [
      "Unlimited team members",
      "Advanced WanderRoute AI Planner",
      "Unlimited searches",
      "Priority webhook processing",
      "Premium 24/7 support",
    ],
    priceId: "price_pro",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "month",
    description: "Custom enterprise tier for scale and security.",
    features: [
      "Custom SLA support",
      "Dedicated API key access",
      "On-prem database syncing",
      "Tailored machine learning models",
      "Enterprise audit logs",
    ],
    priceId: "price_enterprise",
  },
];

type Theme = "light" | "dark" | "cyberpunk";

export default function BillingDashboardClient({
  user,
  subscription,
}: BillingDashboardClientProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user.role === "owner";
  const hasOrg = !!user.organizationId;
  const currentPriceId = subscription?.status === "active" ? subscription.providerPriceId : null;

  // Determine current active plan name
  let activePlanName = "Starter (Free)";
  if (subscription?.status === "active") {
    const matchedPlan = PLANS.find((p) => p.priceId === subscription.providerPriceId);
    if (matchedPlan) {
      activePlanName = matchedPlan.name;
    } else {
      activePlanName = "Custom Plan";
    }
  }

  // Theme configuration details
  const themeClasses = {
    light: "bg-slate-50 text-slate-900 border-slate-200",
    dark: "bg-slate-950 text-slate-50 border-slate-900",
    cyberpunk: "bg-[#09090b] text-[#00ff66] border-[#ff007f] font-mono",
  };

  const cardThemeClasses = {
    light: "bg-white border-slate-200 shadow-sm",
    dark: "bg-slate-900/50 border-slate-800 backdrop-blur-md shadow-2xl",
    cyberpunk: "bg-black/80 border-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.15)] border-2",
  };

  const buttonPrimaryTheme = {
    light: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all duration-300 transform hover:-translate-y-0.5",
    dark: "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 transform hover:-translate-y-0.5",
    cyberpunk: "bg-transparent border-2 border-[#ff007f] text-[#ff007f] hover:bg-[#ff007f] hover:text-black hover:shadow-[0_0_15px_#ff007f] transition-all duration-300 font-bold uppercase tracking-widest",
  };

  const accentTextClasses = {
    light: "text-indigo-600",
    dark: "text-violet-400",
    cyberpunk: "text-[#ff007f]",
  };

  const handleCheckout = async (priceId: string) => {
    if (!isOwner) return;
    setLoading(priceId);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!isOwner) return;
    setLoading("portal");
    setError(null);

    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer portal session.");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`min-h-screen p-8 transition-colors duration-500 ${themeClasses[theme]}`}>
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header and Theme Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Billing & Subscription
            </h1>
            <p className="mt-2 text-sm opacity-70">
              Manage your organization plan, payment settings, and subscription lifecycle.
            </p>
          </div>

          {/* Theme Presets Switcher */}
          <div className="flex items-center gap-2 self-start rounded-xl p-1 bg-slate-800/60 border border-slate-700/60">
            {(["light", "dark", "cyberpunk"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  theme === t
                    ? t === "cyberpunk"
                      ? "bg-[#00ff66] text-black shadow-[0_0_10px_#00ff66]"
                      : t === "light"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-black"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Info / Warnings */}
        {error && (
          <div className="rounded-xl border border-red-500 bg-red-500/10 p-4 text-sm text-red-500 shadow-lg">
            {error}
          </div>
        )}

        {!hasOrg && (
          <div className="rounded-xl border border-amber-500 bg-amber-500/10 p-5 text-sm text-amber-500 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No Active Organization</p>
              <p className="mt-1 opacity-80">
                You must create or join an organization to subscribe to a paid billing plan. Subscription terms apply to organization environments.
              </p>
            </div>
          </div>
        )}

        {hasOrg && !isOwner && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-muted-foreground flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0" />
            <span>
              <strong>Note:</strong> You are viewing organization subscription details. Only users with the <span className="text-foreground font-semibold">Owner</span> role can perform updates or initiate checkout.
            </span>
          </div>
        )}

        {/* Current Plan Overview Card */}
        {hasOrg && (
          <Card className={`border transition-all duration-300 ${cardThemeClasses[theme]}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className={`h-5 w-5 ${accentTextClasses[theme]}`} />
                Current Workspace Status
              </CardTitle>
              {subscription?.status === "active" && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-inner border border-emerald-500/30 animate-pulse">
                  Active Subscription
                </span>
              )}
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 pt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs opacity-60 uppercase font-semibold">Current Plan</p>
                  <p className="text-2xl font-black mt-0.5 tracking-wide">{activePlanName}</p>
                </div>
                {subscription?.currentPeriodEnd && (
                  <div>
                    <p className="text-xs opacity-60 uppercase font-semibold">
                      {subscription.cancelAtPeriodEnd ? "Expires On" : "Renews On"}
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                        dateStyle: "long",
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-end space-y-4 md:items-end">
                {subscription?.status === "active" ? (
                  <Button
                    id="manage-billing-btn"
                    disabled={!isOwner || loading === "portal"}
                    onClick={handlePortal}
                    className={`w-full md:w-auto ${buttonPrimaryTheme[theme]}`}
                  >
                    {loading === "portal" ? "Loading Portal..." : "Manage Subscription & Billing"}
                  </Button>
                ) : (
                  <p className="text-sm opacity-70 md:text-right">
                    You are on the Starter (Free) plan. Select a premium tier below to upgrade your workspace.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Available Subscription Plans</h2>
            <p className="mt-1 text-sm opacity-75">
              Choose the level of scale, AI capacity, and support your team demands.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 pt-4">
            {PLANS.map((plan) => {
              const isActive = plan.priceId === currentPriceId;
              const isFree = plan.id === "free";
              const isUpgrade = !isActive && plan.priceId && hasOrg;
              const cardBorder = plan.popular
                ? theme === "cyberpunk"
                  ? "border-[#ff007f] shadow-[0_0_20px_rgba(255,0,127,0.25)] border-2 scale-102"
                  : theme === "light"
                  ? "border-indigo-600 ring-2 ring-indigo-600/30 scale-102 shadow-lg"
                  : "border-violet-500 ring-2 ring-violet-500/20 scale-102 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                : "";

              return (
                <Card
                  key={plan.id}
                  id={`plan-${plan.id}-card`}
                  className={`flex flex-col border transition-all duration-300 hover:scale-103 ${cardThemeClasses[theme]} ${cardBorder}`}
                >
                  <CardHeader className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold opacity-70 uppercase tracking-widest">
                        {plan.name}
                      </span>
                      {plan.popular && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${
                          theme === "cyberpunk"
                            ? "bg-[#ff007f] text-black"
                            : theme === "light"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-violet-950 text-violet-200"
                        }`}>
                          Most Popular
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className="ml-1 text-sm opacity-60">/{plan.period}</span>
                    </div>
                    <p className="mt-2 text-xs opacity-75 leading-relaxed">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-0 flex-none">
                    <ul className="space-y-3 text-xs opacity-90 border-t pt-4 border-slate-800">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className={`h-4 w-4 shrink-0 ${accentTextClasses[theme]}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isActive ? (
                      <Button
                        disabled
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                      >
                        Your Current Plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        id={`upgrade-${plan.id}-btn`}
                        disabled={!isOwner || (loading !== null)}
                        onClick={() => handleCheckout(plan.priceId!)}
                        className={`w-full ${buttonPrimaryTheme[theme]}`}
                      >
                        {loading === plan.priceId ? (
                          "Redirecting..."
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    ) : isFree && !subscription ? (
                      <Button
                        disabled
                        className="w-full bg-slate-800/40 border border-slate-700/50 cursor-default text-muted-foreground"
                      >
                        Active Account Plan
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full bg-slate-800/40 border border-slate-700/50 cursor-default text-muted-foreground"
                      >
                        Locked
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
