"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite_token");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = inviteToken
      ? `/api/auth/register?invite_token=${inviteToken}`
      : "/api/auth/register";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      if (data.error?.toLowerCase().includes("already exists")) {
        setError("An account with this email already exists.");
      } else if (data.error?.toLowerCase().includes("8 characters")) {
        setError("Password must be at least 8 characters.");
      } else {
        setError(data.error || "Something went wrong — please try again.");
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h2>
        <CardDescription className="text-muted-foreground">
          {inviteToken
            ? "You've been invited — complete registration to join your team."
            : "Start your journey with NextSaas."}
        </CardDescription>
      </CardHeader>

      {inviteToken && (
        <div
          id="register-invite-banner"
          className="rounded-lg border border-border bg-accent px-4 py-3 text-sm text-foreground mb-4"
        >
          🎉 You&apos;ve been invited! Register below to accept and join your team.
        </div>
      )}

      <CardContent className="px-0 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              required
              readOnly={!!inviteToken}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="read-only:opacity-60 read-only:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p id="register-error" className="text-sm text-red-500">{error}</p>
          )}

          <Button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="px-0 pb-0 flex flex-col space-y-3 text-center text-sm">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-foreground font-medium hover:underline">
            Log in
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
