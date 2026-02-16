import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils";

export function PercentDistance({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        value > 0 ? "text-stock-buy" : value < 0 ? "text-stock-sell" : "text-stock-neutral"
      )}
    >
      {formatPercent(value)}
    </span>
  );
}
