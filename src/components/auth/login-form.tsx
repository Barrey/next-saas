"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

type Mode = "password" | "magic-link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirected_from");

  const [mode, setMode] = React.useState<Mode>("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mode === "magic-link") {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          setSuccessMsg("Check your email — we sent a login link.");
        } else {
          const data = await res.json();
          setError(data.error || "Something went wrong — please try again.");
        }
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requiresTwoFactor) {
          router.push("/auth/verify-2fa");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      if (res.status === 403) {
        if (data.error?.toLowerCase().includes("suspended")) {
          setError("Your account has been suspended.");
        } else {
          setError(data.error || "Account locked — try again in 15 minutes.");
        }
      } else {
        setError("Invalid email or password.");
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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
        <CardDescription className="text-muted-foreground">
          {redirectedFrom ? "Please log in to continue." : "Sign in to your account."}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode === "password" && (
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p id="login-error" className="text-sm text-red-500">{error}</p>
          )}
          {successMsg && (
            <p id="login-success" className="text-sm text-green-600">{successMsg}</p>
          )}

          <Button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading
              ? "Please wait..."
              : mode === "password"
              ? "Sign in"
              : "Send magic link"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="px-0 pb-0 flex flex-col space-y-3 text-center text-sm">
        <Button
          variant="link"
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "magic-link" : "password");
            setError("");
            setSuccessMsg("");
          }}
          className="text-muted-foreground hover:text-foreground p-0 h-auto font-normal underline underline-offset-2"
        >
          {mode === "password" ? "Or, send me a magic link" : "Back to password sign in"}
        </Button>
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-foreground font-medium hover:underline">
            Register
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}

