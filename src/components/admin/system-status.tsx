"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface SystemStatusData {
  lastDataFetch: string | null;
  totalStocks: number;
  totalUsers: number;
  recentErrorCount: number;
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-status");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch system status");
      }

      const data = await res.json();
      setStatus(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch system status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Overview of the system health and data fetching status.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !status ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 animate-pulse">
                <div className="h-3 w-20 bg-muted rounded mb-2" />
                <div className="h-6 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : status ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Last Data Fetch</p>
              <p className="text-lg font-semibold">
                {status.lastDataFetch ? formatDate(status.lastDataFetch) : "Never"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Stocks</p>
              <p className="text-lg font-semibold tabular-nums">{status.totalStocks}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-lg font-semibold tabular-nums">{status.totalUsers}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Recent Errors</p>
              <p className={`text-lg font-semibold tabular-nums ${status.recentErrorCount > 0 ? "text-destructive" : ""}`}>
                {status.recentErrorCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load system status.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
