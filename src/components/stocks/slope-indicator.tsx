import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SlopeIndicator({ direction }: { direction: "up" | "down" }) {
  return direction === "up" ? (
    <div className="flex items-center gap-1 text-stock-buy">
      <TrendingUp className="h-4 w-4" />
      <span className="text-xs">UP</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-stock-sell">
      <TrendingDown className="h-4 w-4" />
      <span className="text-xs">DOWN</span>
    </div>
  );
}
