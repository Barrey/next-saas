"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function Verify2FAForm() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the code input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      setError("Invalid code — please try again.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Two-factor verification</h2>
        <CardDescription className="text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="verify-2fa-code">Verification code</Label>
            <Input
              id="verify-2fa-code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
            />
          </div>

          {error && (
            <p id="verify-2fa-error" className="text-sm text-red-500">{error}</p>
          )}

          <Button
            id="verify-2fa-submit"
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="px-0 pb-0 flex flex-col space-y-3 text-center text-sm">
        <a href="/login" className="text-foreground font-medium hover:underline">
          Back to login
        </a>
      </CardFooter>
    </Card>
  );
}
