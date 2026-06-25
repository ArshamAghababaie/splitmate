"use client";

import { getCategoryIcon } from "@/lib/category-icons";

type Category = {
  id: string;
  name: string;
  icon: string;
};

type CategoryPickerProps = {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string) => void;
};

export function CategoryPicker({ categories, selected, onSelect }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        const active = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-150 ${
              active
                ? "border-ink bg-primary shadow-[2px_2px_0px_#0D0D0D]"
                : "border-ink/30 bg-surface hover:border-ink"
            }`}
          >
            <Icon size={20} className="text-ink" />
            <span className="text-xs font-medium text-ink">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
