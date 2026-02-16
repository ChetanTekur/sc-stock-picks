import { Badge } from "@/components/ui/badge";
import type { SignalType } from "@/types/database";

const statusConfig: Record<SignalType, { label: string; variant: "buy" | "sell" | "neutral" }> = {
  BUY: { label: "BUY", variant: "buy" },
  SELL_HIGH: { label: "SELL", variant: "sell" },
  SELL_LOW: { label: "SELL", variant: "sell" },
  NEUTRAL: { label: "NEUTRAL", variant: "neutral" },
};

export function StockStatusBadge({ status }: { status: SignalType }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
