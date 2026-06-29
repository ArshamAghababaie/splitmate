"use client";

import { Home, Users, Scale, User, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/balances", label: "Balances", icon: Scale },
  { href: "/profile", label: "Profile", icon: User },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center border-b-2 border-ink bg-surface px-6 py-2">
      <Link href="/dashboard" className="flex items-center gap-2 mr-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-primary">
          <Receipt size={16} className="text-ink" />
        </div>
        <span className="font-display text-sm font-bold">SplitMate</span>
      </Link>
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-primary text-ink"
                  : "text-ink-muted hover:text-ink hover:bg-surface-alt"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
