"use client";

import { useRouter } from "next/navigation";
import { AddStockDialog } from "@/components/stocks/add-stock-dialog";

export function DashboardClient() {
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

  return <AddStockDialog onAdd={handleAddStock} />;
}
