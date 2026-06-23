"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface TwoFactorFormProps {
  initialEnabled: boolean;
}

export function TwoFactorForm({ initialEnabled }: TwoFactorFormProps) {
  const [isEnabled, setIsEnabled] = React.useState(initialEnabled);
  const [isSettingUp, setIsSettingUp] = React.useState(false);
  const [isDisabling, setIsDisabling] = React.useState(false);
  const [secret, setSecret] = React.useState("");
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleStartSetup() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/settings/2fa/setup", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setIsSettingUp(true);
      } else {
        setError(data.error || "Failed to initialize 2FA setup.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndEnable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/settings/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsEnabled(true);
        setIsSettingUp(false);
        setCode("");
        setSecret("");
        setQrCodeUrl("");
        setSuccess("Two-factor authentication has been enabled.");
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/settings/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok) {
        setIsEnabled(false);
        setIsDisabling(false);
        setPassword("");
        setSuccess("Two-factor authentication has been disabled.");
      } else {
        setError(data.error || "Incorrect password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            <CardDescription>Add an extra layer of security to your account.</CardDescription>
          </div>
          <div>
            {isEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">
                <ShieldCheck className="h-3 w-3" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-400">
                <ShieldAlert className="h-3 w-3" />
                Disabled
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p id="twofa-error" className="text-sm text-red-500">{error}</p>}
        {success && <p id="twofa-success" className="text-sm text-green-600">{success}</p>}

        {/* 1. Main Action Toggle when not setting up/disabling */}
        {!isSettingUp && !isDisabling && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              When 2FA is active, you will be prompted for a secure 6-digit verification code from your authenticator app (like Google Authenticator or Authy) when logging in.
            </p>
            {isEnabled ? (
              <Button
                id="twofa-disable-trigger"
                variant="destructive"
                onClick={() => {
                  setIsDisabling(true);
                  setError("");
                  setSuccess("");
                }}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                id="twofa-enable-trigger"
                onClick={handleStartSetup}
                disabled={loading}
              >
                {loading ? "Initializing..." : "Enable 2FA"}
              </Button>
            )}
          </div>
        )}

        {/* 2. Enable Setup Form */}
        {isSettingUp && (
          <div className="space-y-6 border-t border-border pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Configure Authenticator App</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                <li>Scan the QR code below using your authenticator app:</li>
                {qrCodeUrl && (
                  <div className="my-4 flex justify-center bg-white p-4 rounded-lg border border-border w-48 h-48 mx-auto">
                    {/* Public secure API to render QR Code */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        qrCodeUrl
                      )}`}
                      alt="TOTP QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <li>If you cannot scan the QR code, manually enter this secret key:</li>
                <div className="bg-accent text-accent-foreground text-center font-mono py-2 rounded-lg text-sm select-all tracking-wider font-bold">
                  {secret}
                </div>
                <li>Enter the 6-digit verification code from your app below:</li>
              </ol>
            </div>

            <form onSubmit={handleVerifyAndEnable} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="twofa-code">Verification Code</Label>
                <Input
                  id="twofa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button id="twofa-verify-submit" type="submit" disabled={loading || code.length !== 6}>
                  {loading ? "Verifying..." : "Verify & Enable"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsSettingUp(false);
                    setCode("");
                    setSecret("");
                    setQrCodeUrl("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* 3. Disable Confirmation Form */}
        {isDisabling && (
          <form onSubmit={handleDisable} className="space-y-4 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Please enter your password to confirm disabling two-factor authentication.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="twofa-disable-password">Confirm Password</Label>
              <Input
                id="twofa-disable-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-2">
              <Button id="twofa-disable-submit" type="submit" variant="destructive" disabled={loading || !password}>
                {loading ? "Disabling..." : "Confirm & Disable 2FA"}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsDisabling(false);
                  setPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
