export interface SMAResult {
  weekEnding: string;
  smaValue: number;
}

export interface SlopeResult {
  weekEnding: string;
  slope: number;
}

export interface BuySignalEvaluation {
  meetsAllCriteria: boolean;
  priceAboveSMA: boolean;
  slopeNeverNegative: boolean;
  withinFivePercent: boolean;
  currentPrice: number;
  sma200w: number;
  percentDistance: number;
}

export interface SellSignalEvaluation {
  hasSellSignal: boolean;
  isSixtyPercentAbove: boolean;
  isFivePercentBelow: boolean;
  currentPrice: number;
  sma200w: number;
  percentDistance: number;
}
