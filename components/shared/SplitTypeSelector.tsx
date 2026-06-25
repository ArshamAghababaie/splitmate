"use client";

type SplitType = "equal" | "custom" | "percentage";

type SplitTypeSelectorProps = {
  value: SplitType;
  onChange: (type: SplitType) => void;
};

const OPTIONS: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "custom", label: "Custom" },
  { value: "percentage", label: "Percentage" },
];

export function SplitTypeSelector({ value, onChange }: SplitTypeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg border-2 border-ink bg-surface-alt p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all duration-150 ${
            value === opt.value
              ? "bg-primary text-ink border-2 border-ink shadow-[2px_2px_0px_#0D0D0D]"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
