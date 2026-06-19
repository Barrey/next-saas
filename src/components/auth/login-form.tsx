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
        <CardDescription className="text-muted-foreground text-sm">
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

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <span className="relative bg-card px-2 text-[10px] tracking-wider text-muted-foreground uppercase font-semibold">
              Or continue with
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/google/redirect">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.39 1.71l3.27-3.27C17.68 1.58 14.99 1 12 1 7.24 1 3.2 3.73 1.24 7.74l3.88 3.01C6.07 7.79 8.78 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.74-4.93 3.74-8.55z" />
                  <path fill="#FBBC05" d="M5.12 10.75c-.24-.73-.38-1.5-.38-2.3s.14-1.57.38-2.3L1.24 3.14C.45 4.73 0 6.52 0 8.45s.45 3.72 1.24 5.31l3.88-3.01z" />
                  <path fill="#34A853" d="M12 19.96c-3.22 0-5.93-2.75-6.88-5.71l-3.88 3.01C3.2 21.27 7.24 24 12 24c3.27 0 6.01-1.09 8.01-2.96l-3.69-2.87c-1.11.75-2.54 1.79-4.32 1.79z" />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </a>
            </Button>

            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/github/redirect">
                <svg className="size-4 fill-foreground" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </a>
            </Button>

            <Button variant="outline" type="button" asChild className="w-full flex items-center justify-center gap-2">
              <a href="/api/auth/oauth/facebook/redirect">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="hidden sm:inline">Facebook</span>
              </a>
            </Button>
          </div>
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
