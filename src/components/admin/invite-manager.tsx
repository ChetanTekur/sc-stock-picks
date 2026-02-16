"use client";

import { useState } from "react";
import { Copy, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { InviteToken } from "@/types/database";

interface InviteManagerProps {
  initialTokens: InviteToken[];
}

function getTokenStatus(token: InviteToken): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (token.used_at) {
    return { label: "Used", variant: "secondary" };
  }
  if (new Date(token.expires_at) < new Date()) {
    return { label: "Expired", variant: "destructive" };
  }
  return { label: "Available", variant: "default" };
}

export function InviteManager({ initialTokens }: InviteManagerProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate invite");
      }

      const data = await res.json();
      setTokens((prev) => [data.token, ...prev]);
      toast.success("Invite token generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard");
    } catch {
      toast.error("Failed to copy token");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Invite Tokens</CardTitle>
          <CardDescription>
            Generate invite tokens for new users. Each token can be used once.
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          {generating ? "Generating..." : "Generate Token"}
        </Button>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No invite tokens yet. Generate one to invite new users.
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Token</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Created</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Expires</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Copy</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => {
                  const status = getTokenStatus(token);
                  return (
                    <tr key={token.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {token.token.slice(0, 8)}...{token.token.slice(-4)}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {formatDate(token.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {formatDate(token.expires_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(token.token)}
                          disabled={!!token.used_at}
                          className="h-8 w-8"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
