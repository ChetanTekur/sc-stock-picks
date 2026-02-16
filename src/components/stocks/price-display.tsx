import { formatPrice } from "@/lib/utils";

export function PriceDisplay({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{formatPrice(value)}</span>;
}
