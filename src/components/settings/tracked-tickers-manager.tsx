"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddStockDialog } from "@/components/stocks/add-stock-dialog";
import { toast } from "sonner";

interface TrackedTicker {
  tickerId: string;
  ticker: string;
  companyName: string;
}

interface TrackedTickersManagerProps {
  tickers: TrackedTicker[];
}

export function TrackedTickersManager({ tickers: initialTickers }: TrackedTickersManagerProps) {
  const router = useRouter();
  const [tickers, setTickers] = useState(initialTickers);
  const [deleteTarget, setDeleteTarget] = useState<TrackedTicker | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/tickers/${deleteTarget.tickerId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove stock");
      }

      setTickers((prev) => prev.filter((t) => t.tickerId !== deleteTarget.tickerId));
      toast.success(`Removed ${deleteTarget.ticker} from tracking`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove stock");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddStock(ticker: string) {
    const res = await fetch("/api/tickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add stock");
    }

    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Tracked Tickers</CardTitle>
            <CardDescription>
              Manage the stocks you are tracking. Add new tickers or remove existing ones.
            </CardDescription>
          </div>
          <AddStockDialog onAdd={handleAddStock} />
        </CardHeader>
        <CardContent>
          {tickers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stocks tracked yet. Click &quot;Add Stock&quot; to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {tickers.map((ticker) => (
                <div
                  key={ticker.tickerId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <p className="font-mono font-semibold">{ticker.ticker}</p>
                    <p className="text-sm text-muted-foreground">{ticker.companyName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(ticker)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Stock</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop tracking{" "}
              <span className="font-mono font-semibold">{deleteTarget?.ticker}</span>? This will
              remove it from your watchlist and you will no longer receive notifications for it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
