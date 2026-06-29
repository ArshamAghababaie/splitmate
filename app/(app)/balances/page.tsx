"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { Drawer } from "@/components/ui/Drawer";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { createClient } from "@/lib/supabase/client";
import { hapticSuccess } from "@/lib/haptics";
import { fetchJSON } from "@/lib/api";

type DebtItem = {
  groupId: string;
  fromUser: string;
  toUser: string;
  amountToman: number;
  fromUserProfile: { full_name: string; avatar_color: string | null } | null;
  toUserProfile: { full_name: string; avatar_color: string | null } | null;
};

type PersonBalance = {
  userId: string;
  name: string;
  avatarColor: string | null;
  net: number;
  debts: DebtItem[];
};

export default function BalancesPage() {
  const [personBalances, setPersonBalances] = useState<PersonBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [netBalance, setNetBalance] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);
  const [settleDebt, setSettleDebt] = useState<DebtItem | null>(null);
  const [settling, setSettling] = useState(false);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const groupsData = await fetchJSON<{ id: string }[]>("/api/groups");
      if (!Array.isArray(groupsData)) return;

      const allDebts: DebtItem[] = [];
      await Promise.all(
        groupsData.map(async (g: { id: string }) => {
          const balData = await fetchJSON<{ debts: DebtItem[] }>(`/api/groups/${g.id}/balances`);
          if (!balData?.debts) return;
          for (const d of balData.debts) {
            if (d.fromUser === user.id || d.toUser === user.id) {
              allDebts.push({ ...d, groupId: g.id });
            }
          }
        }),
      );

      let owed = 0;
      let owe = 0;
      const personMap = new Map<string, PersonBalance>();

      for (const d of allDebts) {
        const youOwe = d.fromUser === user.id;
        const otherId = youOwe ? d.toUser : d.fromUser;
        const otherProfile = youOwe ? d.toUserProfile : d.fromUserProfile;
        const amount = youOwe ? -d.amountToman : d.amountToman;

        if (youOwe) owe += d.amountToman;
        else owed += d.amountToman;

        const existing = personMap.get(otherId);
        if (existing) {
          existing.net += amount;
          existing.debts.push(d);
        } else {
          personMap.set(otherId, {
            userId: otherId,
            name: otherProfile?.full_name ?? "Unknown",
            avatarColor: otherProfile?.avatar_color ?? null,
            net: amount,
            debts: [d],
          });
        }
      }

      setTotalOwed(owed);
      setTotalOwe(owe);
      setNetBalance(owed - owe);
      setPersonBalances(
        Array.from(personMap.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettle = async () => {
    if (!settleDebt) return;
    setSettling(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: settleDebt.groupId,
          fromUser: settleDebt.fromUser,
          toUser: settleDebt.toUser,
          amountToman: settleDebt.amountToman,
        }),
      });
      if (res.ok) {
        hapticSuccess();
        const key = `${settleDebt.fromUser}-${settleDebt.toUser}-${settleDebt.groupId}`;
        setSettledIds((prev) => new Set(prev).add(key));
        setSettleDebt(null);
        setTimeout(() => loadData(), 1500);
      }
    } finally {
      setSettling(false);
    }
  };

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
      <PageHeader title="Balances" />

      <div className="flex flex-col gap-4 p-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
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

            {personBalances.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                message="All settled up!"
                subtext="No outstanding balances"
                iconClassName="bg-positive/20"
              />
            ) : (
              <div className="space-y-2">
                {personBalances.map((person) => {
                  const isSettled = person.debts.every((d) =>
                    settledIds.has(`${d.fromUser}-${d.toUser}-${d.groupId}`),
                  );
                  return (
                    <Card
                      key={person.userId}
                      className={`flex items-center gap-3 transition-all duration-500 ${
                        isSettled ? "opacity-40" : ""
                      }`}
                    >
                      <Avatar
                        userId={person.userId}
                        name={person.name}
                        color={person.avatarColor}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {person.name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {person.net > 0
                            ? "Owes you"
                            : "You owe"}
                        </p>
                      </div>
                      {isSettled ? (
                        <div className="flex items-center gap-1 text-positive text-sm font-semibold">
                          <Check size={16} />
                          Settled!
                        </div>
                      ) : (
                        <>
                          <AmountDisplay
                            amount={person.net}
                            className="text-sm transition-colors duration-700"
                          />
                          <button
                            onClick={() => setSettleDebt(person.debts[0])}
                            className="flex items-center gap-1 rounded-lg border-2 border-ink bg-positive/10 px-2 py-1 text-xs font-semibold text-positive hover:bg-positive/20 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-150"
                          >
                            <CheckCircle size={14} />
                            Settle
                          </button>
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Drawer
        open={!!settleDebt}
        onClose={() => setSettleDebt(null)}
        title="Confirm Settlement"
      >
        {settleDebt && (
          <div className="flex flex-col gap-4">
            <Card className="text-center">
              <p className="text-sm text-ink-muted">
                {settleDebt.fromUser === userId ? "You" : settleDebt.fromUserProfile?.full_name ?? "?"}{" "}
                {settleDebt.fromUser === userId ? "pay" : "pays"}{" "}
                {settleDebt.toUser === userId ? "you" : settleDebt.toUserProfile?.full_name ?? "?"}
              </p>
              <AmountDisplay
                amount={settleDebt.amountToman}
                className="text-2xl mt-1"
              />
            </Card>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSettle}
              disabled={settling}
              className="flex items-center justify-center gap-2"
            >
              {settling ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Settling...
                </>
              ) : (
                "Confirm Settlement"
              )}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setSettleDebt(null)}
            >
              Cancel
            </Button>
          </div>
        )}
      </Drawer>
    </PullToRefresh>
  );
}
