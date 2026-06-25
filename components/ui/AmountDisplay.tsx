import { formatAmount } from "@/lib/format";

type AmountDisplayProps = {
  amount: number;
  showCurrency?: boolean;
  showSign?: boolean;
  className?: string;
};

export function AmountDisplay({
  amount,
  showCurrency = true,
  showSign = false,
  className = "",
}: AmountDisplayProps) {
  const colorClass =
    amount > 0
      ? "text-positive"
      : amount < 0
        ? "text-negative"
        : "text-neutral";

  const sign = showSign && amount > 0 ? "+" : showSign && amount < 0 ? "-" : "";

  return (
    <span className={`font-display font-bold ${colorClass} ${className}`}>
      {sign}{formatAmount(amount)}
      {showCurrency && <span className="ml-1 text-[0.75em]">Toman</span>}
    </span>
  );
}
