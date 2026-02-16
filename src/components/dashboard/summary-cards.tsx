import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/stock";

export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Tracked</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{summary.totalTracked}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="border-l-4 border-l-stock-buy">
        <CardHeader className="pb-2">
          <CardDescription>Buy Signals</CardDescription>
          <CardTitle className="text-3xl tabular-nums text-stock-buy">{summary.buyCount}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="border-l-4 border-l-stock-sell">
        <CardHeader className="pb-2">
          <CardDescription>Sell Signals</CardDescription>
          <CardTitle className="text-3xl tabular-nums text-stock-sell">{summary.sellCount}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Neutral</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{summary.neutralCount}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
