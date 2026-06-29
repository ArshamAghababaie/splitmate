"use client";

import { useEffect, useState, useCallback } from "react";
import { Receipt, Users, ArrowRight } from "lucide-react";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/layout/FAB";
import { AddExpenseDrawer } from "./add-expense-drawer";
import { getCategoryIcon } from "@/lib/category-icons";
import { relativeDate } from "@/lib/format";
import { fetchJSON } from "@/lib/api";

type Group = {
  id: string;
  name: string;
  memberCount: number;
};

type DebtItem = {
  fromUser: string;
  toUser: string;
  amountToman: number;
  fromUserProfile: { full_name: string; avatar_color: string | null } | null;
  toUserProfile: { full_name: string; avatar_color: string | null } | null;
};

type RecentExpense = {
  id: string;
  group_id: string | null;
  description: string;
  amount_toman: number;
  expense_date: string;
  categories: { name: string; icon: string } | null;
  profiles: { id: string; full_name: string; avatar_color: string | null } | null;
  groups: { name: string } | null;
};

export function DashboardContent({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {

      const [groupsData, recentData] = await Promise.all([
        fetchJSON<Group[]>("/api/groups"),
        fetchJSON<RecentExpense[]>("/api/expenses?limit=5"),
      ]);

      if (Array.isArray(groupsData)) {
        setGroups(groupsData);
      }

      if (Array.isArray(recentData)) {
        setRecentExpenses(recentData);
      }

      if (Array.isArray(groupsData) && groupsData.length > 0) {
        const balResults = await Promise.all(
          groupsData.map(async (g: Group) => {
            return (await fetchJSON<{ debts: DebtItem[] }>(`/api/groups/${g.id}/balances`)) ?? { debts: [] as DebtItem[] };
          }),
        );

        let owed = 0;
        let owe = 0;
        for (const balData of balResults) {
          if (!balData.debts) continue;
          for (const d of balData.debts as DebtItem[]) {
            if (d.toUser === userId) owed += d.amountToman;
            if (d.fromUser === userId) owe += d.amountToman;
          }
        }
        setTotalOwed(owed);
        setTotalOwe(owe);
        setNetBalance(owed - owe);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const balanceLabel =
    netBalance > 0
      ? "You are owed"
      : netBalance < 0
        ? "You owe"
        : "All settled up";

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <header className="border-b-2 border-ink bg-surface px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-primary">
            <Receipt size={20} className="text-ink" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">SplitMate</h1>
            <p className="text-xs text-ink-muted">Welcome, {userName}!</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <Card className="text-center">
          <p className="text-xs text-ink-muted mb-1">{balanceLabel}</p>
          {netBalance !== 0 ? (
            <AmountDisplay amount={netBalance} showSign className="text-2xl" />
          ) : (
            <p className="font-display text-2xl font-bold text-neutral">0</p>
          )}
          <div className="mt-3 flex justify-center gap-6 text-xs">
            <div>
              <span className="text-ink-muted">Owed to you: </span>
              <span className="font-display font-bold text-positive">
                {totalOwed.toLocaleString("en-US")}
              </span>
            </div>
            <div>
              <span className="text-ink-muted">You owe: </span>
              <span className="font-display font-bold text-negative">
                {totalOwe.toLocaleString("en-US")}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold">Groups</h2>
          <Link
            href="/groups"
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
          >
            See all <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            message="Welcome to SplitMate"
            subtext="Create a group and add your first expense to get started"
            actionLabel="Create a group"
            onAction={() => (window.location.href = "/groups")}
          />
        ) : (
          <div className="space-y-3">
            {groups.slice(0, 3).map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`}>
                <Card className="flex items-center gap-3 hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150">
                  <Avatar userId={g.id} name={g.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm truncate">
                      {g.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-ink-muted" />
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && recentExpenses.length > 0 && (
          <>
            <h2 className="font-display text-sm font-bold mt-2">
              Recent Activity
            </h2>
            <div className="space-y-2">
              {recentExpenses.map((exp) => {
                const CatIcon = getCategoryIcon(exp.categories?.icon ?? "");
                return (
                  <Card key={exp.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-primary p-1.5 shrink-0">
                      <CatIcon size={18} className="text-ink" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {exp.description || exp.categories?.name || "Expense"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="truncate">{exp.groups?.name ?? "Personal"}</span>
                        <span>&middot;</span>
                        <span className="shrink-0">{relativeDate(exp.expense_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {exp.profiles && (
                        <Avatar
                          userId={exp.profiles.id}
                          name={exp.profiles.full_name}
                          size="sm"
                          color={exp.profiles.avatar_color}
                        />
                      )}
                      <span className="font-display font-bold text-sm text-ink">
                        {exp.amount_toman.toLocaleString("en-US")}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {!loading && groups.length > 0 && recentExpenses.length === 0 && (
          <EmptyState
            icon={Receipt}
            message="No expenses yet. Add your first one!"
          />
        )}
      </div>

      <FAB onClick={() => setExpenseOpen(true)} />
      <AddExpenseDrawer
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        groups={groups}
        userId={userId}
        onSuccess={() => loadData()}
      />
    </PullToRefresh>
  );
}
