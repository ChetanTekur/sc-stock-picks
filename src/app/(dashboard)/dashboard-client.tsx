"use client";

import { useRouter } from "next/navigation";
import { AddStockDialog } from "@/components/stocks/add-stock-dialog";
import { StockTable } from "@/components/stocks/stock-table";
import { StockCard } from "@/components/stocks/stock-card";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import type { StockDisplay, DashboardSummary } from "@/types/stock";
import { toast } from "sonner";

interface DashboardClientProps {
  stocks: StockDisplay[];
  summary: DashboardSummary;
}

export function DashboardClient({ stocks, summary }: DashboardClientProps) {
  const router = useRouter();

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

  async function handleRemoveStock(userTickerId: string, ticker: string) {
    const res = await fetch(`/api/tickers/${userTickerId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to remove stock");
      return;
    }
    toast.success(`Removed ${ticker} from tracking`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <AddStockDialog onAdd={handleAddStock} />
      </div>
      <SummaryCards summary={summary} />
      <div className="hidden lg:block">
        <StockTable stocks={stocks} onRemove={handleRemoveStock} />
      </div>
      <div className="lg:hidden space-y-3">
        {stocks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No stocks tracked yet</p>
            <p className="text-sm">Add your first stock to get started</p>
          </div>
        ) : (
          stocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              onRemove={handleRemoveStock}
            />
          ))
        )}
      </div>
    </div>
  );
}
