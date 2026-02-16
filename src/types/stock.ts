import type { SignalType } from "./database";

export interface StockDisplay {
  id: string;
  ticker: string;
  companyName: string;
  currentPrice: number;
  sma200w: number;
  percentDistance: number;
  smaSlope: "up" | "down";
  status: SignalType;
  isOwned: boolean;
  lastUpdated: string;
}

export interface DashboardSummary {
  totalTracked: number;
  buyCount: number;
  sellCount: number;
  neutralCount: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  sma200w: number | null;
}

export interface StockDetail extends StockDisplay {
  chartData: ChartDataPoint[];
  signalHistory: {
    type: SignalType;
    triggeredAt: string;
    resolvedAt: string | null;
  }[];
}
