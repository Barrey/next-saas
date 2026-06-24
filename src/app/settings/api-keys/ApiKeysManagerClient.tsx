"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Copy, Check, ShieldAlert } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  truncatedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKeysManagerClientProps {
  initialKeys: ApiKey[];
}

export function ApiKeysManagerClient({ initialKeys }: ApiKeysManagerClientProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    setNewRawKey(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewRawKey(data.rawKey);
        setName("");
        // Refetch list
        const listRes = await fetch("/api/settings/api-keys");
        const listData = await listRes.json();
        if (listRes.ok) {
          setKeys(listData.keys.map((k: any) => ({
            id: k.id,
            name: k.name,
            truncatedKey: k.truncatedKey,
            createdAt: k.createdAt,
            lastUsedAt: k.lastUsedAt,
          })));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      const res = await fetch("/api/settings/api-keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Create API Key card */}
      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
          <CardDescription>Generate a new key to access REST endpoints.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name-input">Key Name</Label>
              <div className="flex gap-4">
                <Input
                  id="api-key-name-input"
                  type="text"
                  placeholder="Key Name (e.g., Production API Key)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                <Button type="submit" disabled={loading} id="generate-key-btn">
                  {loading ? "Generating..." : "Generate Key"}
                </Button>
              </div>
            </div>
          </form>

          {newRawKey && (
            <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/10 rounded-md space-y-2 text-sm text-foreground animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                <span>Important: Copy your API Key</span>
              </div>
              <p className="text-muted-foreground text-xs">
                This key will not be shown again for security reasons. Copy it now.
              </p>
              <div className="flex gap-2 items-center bg-card border border-border p-2 rounded-md">
                <code className="flex-1 break-all text-xs select-all text-foreground font-mono" id="raw-key-output">
                  {newRawKey}
                </code>
                <Button variant="ghost" size="icon" onClick={handleCopy} type="button">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Keys Card */}
      <Card>
        <CardHeader>
          <CardTitle>Active Keys</CardTitle>
          <CardDescription>Keys that currently have access to your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No active API keys found.</p>
          ) : (
            <div className="border border-border rounded-md divide-y divide-border">
              {keys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-4 flex-wrap gap-4 text-sm hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{key.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{key.truncatedKey}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Created: {new Date(key.createdAt).toLocaleDateString()} | Last Used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevoke(key.id)}
                    className="flex items-center gap-2 revoke-key-btn"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
