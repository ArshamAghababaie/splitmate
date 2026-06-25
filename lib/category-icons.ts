import {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Home,
  Gamepad2,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  film: Gamepad2,
  ellipsis: Tag,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return CATEGORY_ICON_MAP[iconName] ?? Tag;
}
