"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  UserPlus,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
  Pencil,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { GhostAvatar } from "@/components/ui/GhostAvatar";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/layout/FAB";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AddExpenseDrawer } from "../../dashboard/add-expense-drawer";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { getCategoryIcon } from "@/lib/category-icons";
import { hapticSuccess, hapticError } from "@/lib/haptics";
import { formatAmount, formatDate, relativeDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { fetchJSON } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

type Member = {
  id: string;
  fullName: string | null;
  email: string;
  avatarColor: string | null;
  isPending: boolean;
};

type ExpenseSplit = {
  userId: string | null;
  pendingMemberId: string | null;
  isPending: boolean;
  amountOwed: number;
  email?: string | null;
};

type Expense = {
  id: string;
  amount_toman: number;
  description: string;
  expense_date: string;
  created_by?: string;
  paid_by?: string | null;
  pending_paid_by?: string | null;
  category_id?: string;
  group_id?: string;
  categories: { name: string; icon: string } | null;
  payer: {
    id: string;
    fullName: string | null;
    email: string | null;
    avatarColor: string | null;
    isPending: boolean;
  } | null;
  expense_splits: ExpenseSplit[];
};

type DebtItem = {
  fromUser: string;
  toUser: string;
  amountToman: number;
  fromIsPending: boolean;
  fromEmail?: string;
  toIsPending: boolean;
  toEmail?: string;
  fromUserProfile: { full_name: string; avatar_color: string | null } | null;
  toUserProfile: { full_name: string; avatar_color: string | null } | null;
};

type PendingInviteResult = {
  email: string;
  inviteText: string;
};

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [group, setGroup] = useState<{
    name: string;
    createdBy: string;
    members: Member[];
  } | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expenses" | "balances" | "members">(
    "expenses",
  );
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settleDebt, setSettleDebt] = useState<DebtItem | null>(null);
  const [settling, setSettling] = useState(false);
  const [settledKeys, setSettledKeys] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState("");

  // Action menu state
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [leaveGroupOpen, setLeaveGroupOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  // Delete expense state
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<string | null>(
    null,
  );
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [fadingExpense, setFadingExpense] = useState<string | null>(null);

  // Swipe state
  const [swipedExpense, setSwipedExpense] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Edit expense state
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  // Add member state
  const [emailInput, setEmailInput] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [pendingInviteResult, setPendingInviteResult] =
    useState<PendingInviteResult | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const isCreator = group?.createdBy === userId;

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const [groupData, expData, balData] = await Promise.all([
        fetchJSON<{
          group: {
            id: string;
            name: string;
            createdBy: string;
            createdAt: string;
          };
          members: Member[];
        }>(`/api/groups/${id}`),
        fetchJSON<Expense[]>(`/api/groups/${id}/expenses`),
        fetchJSON<{ debts: DebtItem[] }>(`/api/groups/${id}/balances`),
      ]);

      if (groupData?.group) {
        setGroup({
          name: groupData.group.name,
          createdBy: groupData.group.createdBy,
          members: groupData.members ?? [],
        });
      }
      if (Array.isArray(expData)) setExpenses(expData);
      if (balData?.debts) setDebts(balData.debts);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add member
  const handleAddMember = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add member");
        return;
      }
      if (data.status === "added") {
        setEmailInput("");
        setPendingInviteResult(null);
        setAddMemberOpen(false);
        hapticSuccess();
        toast.success("Member added successfully");
        setGroup((prev) =>
          prev
            ? { ...prev, members: [...prev.members, { ...data.member, isPending: false }] }
            : prev,
        );
      } else if (data.status === "pending") {
        setPendingInviteResult({
          email: data.pendingMember.email,
          inviteText: data.inviteText,
        });
        setEmailInput("");
        hapticSuccess();
        const newPending: Member = {
          id: data.pendingMember.id,
          email: data.pendingMember.email,
          fullName: null,
          avatarColor: null,
          isPending: true,
        };
        setGroup((prev) =>
          prev ? { ...prev, members: [...prev.members, newPending] } : prev,
        );
      }
    } catch {
      hapticError();
      toast.error("Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!pendingInviteResult) return;
    try {
      await navigator.clipboard.writeText(pendingInviteResult.inviteText);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  // Settle
  const handleSettle = async () => {
    if (!settleDebt) return;
    setSettling(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: id,
          fromUser: settleDebt.fromUser,
          toUser: settleDebt.toUser,
          amountToman: settleDebt.amountToman,
        }),
      });
      if (res.ok) {
        hapticSuccess();
        const key = `${settleDebt.fromUser}-${settleDebt.toUser}`;
        setSettledKeys((prev) => new Set(prev).add(key));
        setSettleDebt(null);
        toast.success("Settlement recorded");
        setTimeout(() => loadData(), 1500);
      } else {
        hapticError();
        toast.error("Failed to record settlement");
      }
    } finally {
      setSettling(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    setDeletingGroup(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Group deleted");
        router.push("/groups");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete group");
      }
    } catch {
      toast.error("Failed to delete group");
    } finally {
      setDeletingGroup(false);
      setDeleteGroupOpen(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    setLeavingGroup(true);
    try {
      const res = await fetch(`/api/groups/${id}/members/me`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Left group");
        router.push("/groups");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to leave group");
      }
    } catch {
      toast.error("Failed to leave group");
    } finally {
      setLeavingGroup(false);
      setLeaveGroupOpen(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async () => {
    if (!deleteExpenseTarget) return;
    setDeletingExpense(true);
    try {
      const res = await fetch(`/api/expenses/${deleteExpenseTarget}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteExpenseTarget(null);
        setFadingExpense(deleteExpenseTarget);
        setTimeout(() => {
          setExpenses((prev) =>
            prev.filter((e) => e.id !== deleteExpenseTarget),
          );
          setFadingExpense(null);
        }, 400);
        toast.success("Expense deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete expense");
      }
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setDeletingExpense(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Swipe handlers for expense rows
  const handleExpenseTouchStart = (e: React.TouchEvent, expId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    if (swipedExpense && swipedExpense !== expId) {
      setSwipedExpense(null);
    }
  };

  const handleExpenseTouchEnd = (e: React.TouchEvent, expId: string) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (dx < -60 && dy < 30) {
      setSwipedExpense(expId);
    } else if (dx > 30) {
      setSwipedExpense(null);
    }
  };

  const memberMap = new Map<string, Member>();
  for (const m of group?.members ?? []) {
    memberMap.set(m.id, m);
  }

  const editDataMemo = useMemo(
    () =>
      editExpense
        ? {
            id: editExpense.id,
            description: editExpense.description,
            amountToman: editExpense.amount_toman,
            categoryId: editExpense.category_id ?? "",
            paidBy: editExpense.paid_by ?? (editExpense.pending_paid_by ? null : userId),
            pendingPaidBy: editExpense.pending_paid_by ?? null,
            groupId: editExpense.group_id ?? id,
            expenseDate: editExpense.expense_date,
            splits: editExpense.expense_splits.map((s) => ({
              userId: s.userId,
              pendingMemberId: s.pendingMemberId,
              amountOwed: s.amountOwed,
            })),
          }
        : undefined,
    [editExpense, userId, id],
  );

  const TABS = [
    { key: "expenses" as const, label: "Expenses" },
    { key: "balances" as const, label: "Balances" },
    { key: "members" as const, label: "Members" },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <PageHeader
        title={group?.name ?? "..."}
        showBack
        action={
          <button
            onClick={() => setActionMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink hover:bg-surface-alt transition-colors duration-150"
          >
            <MoreHorizontal size={16} />
          </button>
        }
      />

      <div className="flex border-b-2 border-ink bg-surface">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors duration-150 ${
              tab === t.key
                ? "border-b-2 border-primary text-ink bg-primary/20"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : tab === "expenses" ? (
          expenses.length === 0 ? (
            <EmptyState
              icon={Clock}
              message="No expenses yet"
              subtext="Add the first expense to get started"
              actionLabel="Add Expense"
              onAction={() => setExpenseOpen(true)}
            />
          ) : (
            expenses.map((exp) => {
              const CatIcon = getCategoryIcon(exp.categories?.icon ?? "");
              const isExpanded = expandedExpense === exp.id;
              const isSwiped = swipedExpense === exp.id;
              const isFading = fadingExpense === exp.id;
              const canModify = exp.created_by === userId;

              return (
                <div
                  key={exp.id}
                  className={`relative overflow-hidden rounded-lg transition-all duration-400 ${
                    isFading ? "opacity-0 scale-95 max-h-0" : "max-h-125"
                  }`}
                >
                  {/* Swipe-to-delete background */}
                  {canModify && (
                    <div className="absolute inset-y-0 right-0 flex items-center bg-negative rounded-r-lg">
                      <button
                        onClick={() => setDeleteExpenseTarget(exp.id)}
                        className="flex items-center gap-1 px-4 h-full text-white text-xs font-semibold"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}

                  <Card
                    className={`relative overflow-hidden transition-transform duration-200 ${
                      isSwiped && canModify
                        ? "-translate-x-24"
                        : "translate-x-0"
                    }`}
                    onTouchStart={(e: React.TouchEvent) =>
                      handleExpenseTouchStart(e, exp.id)
                    }
                    onTouchEnd={(e: React.TouchEvent) =>
                      handleExpenseTouchEnd(e, exp.id)
                    }
                  >
                    <button
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => {
                        if (isSwiped) {
                          setSwipedExpense(null);
                          return;
                        }
                        setExpandedExpense(isExpanded ? null : exp.id);
                      }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-primary p-1.5 shrink-0">
                        <CatIcon size={18} className="text-ink" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {exp.description || exp.categories?.name || "Expense"}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                          {exp.payer && (
                            exp.payer.isPending ? (
                              <GhostAvatar size="sm" />
                            ) : (
                              <Avatar
                                userId={exp.payer.id}
                                name={exp.payer.fullName ?? "?"}
                                size="sm"
                                color={exp.payer.avatarColor}
                              />
                            )
                          )}
                          <span>
                            {exp.payer?.isPending
                              ? exp.payer.email
                              : (exp.payer?.fullName ?? "?")}
                          </span>
                          {exp.payer?.isPending && (
                            <span className="text-ink-muted">(pending)</span>
                          )}
                          <span>&middot;</span>
                          <span>{relativeDate(exp.expense_date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-display font-bold text-sm text-ink">
                          {formatAmount(exp.amount_toman)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-ink-muted" />
                        ) : (
                          <ChevronDown size={14} className="text-ink-muted" />
                        )}
                      </div>
                    </button>

                    {/* Expanded detail view */}
                    {isExpanded && (
                      <div className="mt-3 border-t border-ink/10 pt-3 space-y-3">
                        {/* Payer + Category + Date */}
                        <div className="flex items-center gap-3 text-xs">
                          {exp.payer && (
                            <div className="flex items-center gap-1.5">
                              {exp.payer.isPending ? (
                                <GhostAvatar size="sm" />
                              ) : (
                                <Avatar
                                  userId={exp.payer.id}
                                  name={exp.payer.fullName ?? "?"}
                                  size="sm"
                                  color={exp.payer.avatarColor}
                                />
                              )}
                              <span className="font-semibold">
                                {exp.payer.isPending
                                  ? exp.payer.email
                                  : exp.payer.fullName}
                              </span>
                              {exp.payer.isPending && (
                                <span className="text-ink-muted">(pending)</span>
                              )}
                              <span className="text-ink-muted">paid</span>
                            </div>
                          )}
                          <span className="text-ink-muted">&middot;</span>
                          <span className="text-ink-muted">
                            {exp.categories?.name}
                          </span>
                          <span className="text-ink-muted">&middot;</span>
                          <span className="text-ink-muted">
                            {formatDate(exp.expense_date)}
                          </span>
                        </div>

                        {/* Split breakdown */}
                        {exp.expense_splits.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-ink-muted">
                              Split details
                            </p>
                            {exp.expense_splits.map((split, idx) => {
                              if (split.isPending) {
                                return (
                                  <div
                                    key={
                                      split.pendingMemberId ?? `pending-${idx}`
                                    }
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <GhostAvatar size="sm" />
                                      <span className="text-ink-muted">
                                        {split.email ?? "Pending member"}
                                      </span>
                                    </div>
                                    <span className="font-display font-semibold">
                                      {formatAmount(split.amountOwed)} Toman
                                    </span>
                                  </div>
                                );
                              }
                              const member = memberMap.get(split.userId!);
                              return (
                                <div
                                  key={split.userId}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar
                                      userId={split.userId!}
                                      name={member?.fullName ?? "?"}
                                      size="sm"
                                      color={member?.avatarColor}
                                    />
                                    <span>{member?.fullName ?? "Unknown"}</span>
                                  </div>
                                  <span className="font-display font-semibold">
                                    {formatAmount(split.amountOwed)} Toman
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Creator actions */}
                        {canModify && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditExpense(exp);
                              }}
                              className="flex items-center gap-1 rounded-lg border-2 border-ink bg-surface-alt px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors duration-150"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteExpenseTarget(exp.id);
                              }}
                              className="flex items-center gap-1 rounded-lg border-2 border-ink bg-negative/10 px-3 py-1.5 text-xs font-semibold text-negative hover:bg-negative/20 transition-colors duration-150"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })
          )
        ) : tab === "balances" ? (
          debts.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              message="All settled up!"
              subtext="No outstanding balances"
              iconClassName="bg-positive/20"
            />
          ) : (
            debts.map((d, i) => {
              const key = `${d.fromUser}-${d.toUser}`;
              const isSettled = settledKeys.has(key);
              const hasPending = d.fromIsPending || d.toIsPending;
              const canSettle =
                !isSettled &&
                !hasPending &&
                (d.fromUser === userId || d.toUser === userId);

              const fromName = d.fromIsPending
                ? (d.fromEmail ?? "Pending")
                : (d.fromUserProfile?.full_name ?? "?");
              const toName = d.toIsPending
                ? (d.toEmail ?? "Pending")
                : (d.toUserProfile?.full_name ?? "?");

              return (
                <div key={i} className="flex flex-col gap-1">
                  <Card
                    className={`flex items-center gap-3 transition-all duration-500 ${
                      isSettled ? "opacity-40" : ""
                    }`}
                  >
                    {d.fromIsPending ? (
                      <GhostAvatar size="sm" />
                    ) : (
                      <Avatar
                        userId={d.fromUser}
                        name={fromName}
                        size="sm"
                        color={d.fromUserProfile?.avatar_color}
                      />
                    )}
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-semibold">
                        {d.fromUser === userId ? "You" : fromName}
                      </span>
                      <span className="text-ink-muted">
                        {d.fromUser === userId ? " owe " : " owes "}
                      </span>
                      <span className="font-semibold">
                        {d.toUser === userId ? "you" : toName}
                      </span>
                    </div>
                    {isSettled ? (
                      <div className="flex items-center gap-1 text-positive text-sm font-semibold">
                        <CheckCircle size={16} />
                        Settled!
                      </div>
                    ) : (
                      <>
                        <AmountDisplay
                          amount={d.amountToman}
                          showCurrency={false}
                          className="text-sm transition-colors duration-700"
                        />
                        {canSettle && (
                          <button
                            onClick={() => setSettleDebt(d)}
                            className="flex items-center gap-1 rounded-lg border-2 border-ink bg-positive/10 px-2 py-1 text-xs font-semibold text-positive hover:bg-positive/20 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-150"
                          >
                            <CheckCircle size={14} />
                            Settle
                          </button>
                        )}
                      </>
                    )}
                  </Card>
                  {hasPending && (
                    <p className="text-xs text-ink-muted px-1 pt-1">
                      {d.fromIsPending ? d.fromEmail : d.toEmail}{" "}
                      &nbsp;hasn&apos;t signed up yet. Their balance will update
                      when they join.
                    </p>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Members tab */
          <>
            {isCreator && (
              <Button
                variant="secondary"
                onClick={() => setAddMemberOpen(true)}
                className="flex items-center justify-center gap-2 self-start"
              >
                <UserPlus size={16} />
                Add Member
              </Button>
            )}
            <div className="space-y-2">
              {(group?.members ?? []).map((m) => (
                <Card key={m.id} className="flex items-center gap-3">
                  {m.isPending ? (
                    <GhostAvatar />
                  ) : (
                    <Avatar
                      userId={m.id}
                      name={m.fullName ?? m.email}
                      color={m.avatarColor}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {m.isPending ? (
                      <p className="text-sm font-semibold truncate text-ink-muted">
                        {m.email}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold truncate">
                        {m.fullName}
                        {m.id === userId && (
                          <span className="text-ink-muted font-normal">
                            {" "}
                            (you)
                          </span>
                        )}
                      </p>
                    )}
                    {!m.isPending && (
                      <p className="text-xs text-ink-muted truncate">
                        {m.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.isPending && (
                      <span className="text-xs font-semibold text-ink/50 bg-ink/8 px-2 py-0.5 rounded border border-ink/20">
                        Pending
                      </span>
                    )}
                    {!m.isPending && m.id === group?.createdBy && (
                      <span className="text-xs font-semibold text-primary-hover bg-primary/20 px-2 py-0.5 rounded border border-ink/20">
                        Creator
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <FAB onClick={() => setExpenseOpen(true)} />

      {/* Action menu drawer */}
      <Drawer
        open={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        title="Group Actions"
      >
        <div className="flex flex-col gap-2">
          {isCreator ? (
            <button
              onClick={() => {
                setActionMenuOpen(false);
                setDeleteGroupOpen(true);
              }}
              className="flex items-center gap-3 w-full rounded-lg border-2 border-ink bg-negative/10 px-4 py-3 text-left text-sm font-semibold text-negative hover:bg-negative/20 transition-colors duration-150"
            >
              <Trash2 size={18} />
              Delete Group
            </button>
          ) : (
            <button
              onClick={() => {
                setActionMenuOpen(false);
                setLeaveGroupOpen(true);
              }}
              className="flex items-center gap-3 w-full rounded-lg border-2 border-ink bg-surface-alt px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-ink/5 transition-colors duration-150"
            >
              <LogOut size={18} />
              Leave Group
            </button>
          )}
        </div>
      </Drawer>

      {/* Delete group confirmation */}
      <Drawer
        open={deleteGroupOpen}
        onClose={() => setDeleteGroupOpen(false)}
        title="Delete Group"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Delete this group? All expenses, splits, and settlements will be
            permanently removed. This cannot be undone.
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={handleDeleteGroup}
            disabled={deletingGroup}
            className="flex items-center justify-center gap-2"
          >
            {deletingGroup ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Group"
            )}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setDeleteGroupOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Drawer>

      {/* Leave group confirmation */}
      <Drawer
        open={leaveGroupOpen}
        onClose={() => setLeaveGroupOpen(false)}
        title="Leave Group"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Leave this group? You will no longer see its expenses or balances.
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={handleLeaveGroup}
            disabled={leavingGroup}
            className="flex items-center justify-center gap-2"
          >
            {leavingGroup ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Leaving...
              </>
            ) : (
              "Leave Group"
            )}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setLeaveGroupOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Drawer>

      {/* Delete expense confirmation */}
      <Drawer
        open={!!deleteExpenseTarget}
        onClose={() => setDeleteExpenseTarget(null)}
        title="Delete Expense"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Delete this expense? This cannot be undone.
          </p>
          <Button
            variant="danger"
            fullWidth
            onClick={handleDeleteExpense}
            disabled={deletingExpense}
            className="flex items-center justify-center gap-2"
          >
            {deletingExpense ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setDeleteExpenseTarget(null)}
          >
            Cancel
          </Button>
        </div>
      </Drawer>

      {/* Settle confirmation */}
      <Drawer
        open={!!settleDebt}
        onClose={() => setSettleDebt(null)}
        title="Confirm Settlement"
      >
        {settleDebt && (
          <div className="flex flex-col gap-4">
            <Card className="text-center">
              <p className="text-sm text-ink-muted">
                {settleDebt.fromUser === userId
                  ? "You"
                  : settleDebt.fromIsPending
                    ? (settleDebt.fromEmail ?? "?")
                    : (settleDebt.fromUserProfile?.full_name ?? "?")}{" "}
                {settleDebt.fromUser === userId ? "pay" : "pays"}{" "}
                {settleDebt.toUser === userId
                  ? "you"
                  : settleDebt.toIsPending
                    ? (settleDebt.toEmail ?? "?")
                    : (settleDebt.toUserProfile?.full_name ?? "?")}
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

      {/* Add member drawer */}
      <Drawer
        open={addMemberOpen}
        onClose={() => {
          setAddMemberOpen(false);
          setEmailInput("");
          setPendingInviteResult(null);
          setCopyDone(false);
        }}
        title="Add Member"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="friend@example.com"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setPendingInviteResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !addingMember && emailInput.trim()) {
                handleAddMember();
              }
            }}
          />

          {/* Pending invite result card */}
          {pendingInviteResult && (
            <div className="rounded-lg border-2 border-ink bg-surface-alt shadow-[4px_4px_0px_#0D0D0D] p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 text-sm">
                <Clock size={16} className="text-ink-muted mt-0.5 shrink-0" />
                <span className="text-ink-muted leading-snug">
                  <span className="font-semibold text-ink">
                    {pendingInviteResult.email}
                  </span>{" "}
                  hasn&apos;t signed up yet — added as pending
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1.5"
                >
                  {copyDone ? (
                    <>
                      <Check size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy invite
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPendingInviteResult(null);
                    setEmailInput("");
                    setCopyDone(false);
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {!pendingInviteResult && (
            <Button
              variant="primary"
              fullWidth
              onClick={handleAddMember}
              disabled={addingMember || !emailInput.trim()}
              className="flex items-center justify-center gap-2"
            >
              {addingMember ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Member"
              )}
            </Button>
          )}
        </div>
      </Drawer>

      {/* Add / Edit expense drawer */}
      <AddExpenseDrawer
        open={expenseOpen || !!editExpense}
        onClose={() => {
          setExpenseOpen(false);
          setEditExpense(null);
        }}
        groups={group ? [{ id, name: group.name }] : []}
        userId={userId}
        prefilledGroupId={id}
        onSuccess={() => {
          loadData();
          if (editExpense) toast.success("Expense updated");
          else toast.success("Expense added");
        }}
        editData={editDataMemo}
      />
    </PullToRefresh>
  );
}
