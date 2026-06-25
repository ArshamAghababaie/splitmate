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
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/layout/FAB";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { AddExpenseDrawer } from "../../dashboard/add-expense-drawer";
import { UserSearchInput } from "@/components/shared/UserSearchInput";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatAmount, formatDate, relativeDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { fetchJSON } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

type Member = {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string | null;
};

type Expense = {
  id: string;
  amount_toman: number;
  description: string;
  expense_date: string;
  created_by?: string;
  paid_by?: string;
  category_id?: string;
  group_id?: string;
  categories: { name: string; icon: string } | null;
  profiles: {
    id: string;
    full_name: string;
    avatar_color: string | null;
  } | null;
  expense_splits: { user_id: string; amount_owed: number }[];
};

type DebtItem = {
  fromUser: string;
  toUser: string;
  amountToman: number;
  fromUserProfile: { full_name: string; avatar_color: string | null } | null;
  toUserProfile: { full_name: string; avatar_color: string | null } | null;
};

type SelectedUser = {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string | null;
};

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [group, setGroup] = useState<{
    name: string;
    created_by: string;
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
  const [refreshing, setRefreshing] = useState(false);

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
  const [selectedMembers, setSelectedMembers] = useState<SelectedUser[]>([]);
  const [addingMember, setAddingMember] = useState(false);

  const isCreator = group?.created_by === userId;

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setUserId(user.id);

        const [groupData, expData, balData] = await Promise.all([
          fetchJSON<{ name: string; created_by: string; members: Member[] }>(`/api/groups/${id}`),
          fetchJSON<Expense[]>(`/api/groups/${id}/expenses`),
          fetchJSON<{ debts: DebtItem[] }>(`/api/groups/${id}/balances`),
        ]);

        if (groupData?.name) setGroup(groupData);
        if (Array.isArray(expData)) setExpenses(expData);
        if (balData?.debts) setDebts(balData.debts);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add member
  const handleAddMember = async () => {
    if (selectedMembers.length === 0) return;
    setAddingMember(true);
    try {
      for (const member of selectedMembers) {
        const res = await fetch(`/api/groups/${id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: member.email }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to add member");
          setAddingMember(false);
          return;
        }
      }
      setSelectedMembers([]);
      setAddMemberOpen(false);
      toast.success("Member added successfully");
      loadData(true);
    } catch {
      toast.error("Failed to add member");
    } finally {
      setAddingMember(false);
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
        const key = `${settleDebt.fromUser}-${settleDebt.toUser}`;
        setSettledKeys((prev) => new Set(prev).add(key));
        setSettleDebt(null);
        toast.success("Settlement recorded");
        setTimeout(() => loadData(true), 1500);
      } else {
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

  // Pull-to-refresh
  const [touchStartPTR, setTouchStartPTR] = useState(0);
  const handleTouchStartPTR = (e: React.TouchEvent) =>
    setTouchStartPTR(e.touches[0].clientY);
  const handleTouchEndPTR = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartPTR;
    if (diff > 80 && window.scrollY === 0 && !refreshing) {
      loadData(true);
    }
  };

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

  const existingMemberIds = new Set(group?.members.map((m) => m.id) ?? []);

  const editDataMemo = useMemo(
    () =>
      editExpense
        ? {
            id: editExpense.id,
            description: editExpense.description,
            amountToman: editExpense.amount_toman,
            categoryId: editExpense.category_id ?? "",
            paidBy: editExpense.paid_by ?? userId,
            groupId: editExpense.group_id ?? id,
            expenseDate: editExpense.expense_date,
            splits: editExpense.expense_splits.map((s) => ({
              userId: s.user_id,
              amountOwed: s.amount_owed,
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
    <div
      className="flex flex-col"
      onTouchStart={handleTouchStartPTR}
      onTouchEnd={handleTouchEndPTR}
    >
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

      {refreshing && (
        <div className="flex justify-center py-2">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      )}

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
                      isSwiped && canModify ? "-translate-x-24" : "translate-x-0"
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
                          {exp.description ||
                            exp.categories?.name ||
                            "Expense"}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                          {exp.profiles && (
                            <Avatar
                              userId={exp.profiles.id}
                              name={exp.profiles.full_name}
                              size="sm"
                              color={exp.profiles.avatar_color}
                            />
                          )}
                          <span>{exp.profiles?.full_name ?? "?"}</span>
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
                          {exp.profiles && (
                            <div className="flex items-center gap-1.5">
                              <Avatar
                                userId={exp.profiles.id}
                                name={exp.profiles.full_name}
                                size="sm"
                                color={exp.profiles.avatar_color}
                              />
                              <span className="font-semibold">
                                {exp.profiles.full_name}
                              </span>
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
                            {exp.expense_splits.map((split) => {
                              const member = memberMap.get(split.user_id);
                              return (
                                <div
                                  key={split.user_id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar
                                      userId={split.user_id}
                                      name={member?.full_name ?? "?"}
                                      size="sm"
                                      color={member?.avatar_color}
                                    />
                                    <span>
                                      {member?.full_name ?? "Unknown"}
                                    </span>
                                  </div>
                                  <span className="font-display font-semibold">
                                    {formatAmount(split.amount_owed)} Toman
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
              const canSettle =
                !isSettled && (d.fromUser === userId || d.toUser === userId);
              return (
                <Card
                  key={i}
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    isSettled ? "opacity-40" : ""
                  }`}
                >
                  <Avatar
                    userId={d.fromUser}
                    name={d.fromUserProfile?.full_name ?? "?"}
                    size="sm"
                    color={d.fromUserProfile?.avatar_color}
                  />
                  <div className="flex-1 min-w-0 text-sm">
                    <span className="font-semibold">
                      {d.fromUser === userId
                        ? "You"
                        : (d.fromUserProfile?.full_name ?? "?")}
                    </span>
                    <span className="text-ink-muted"> owes </span>
                    <span className="font-semibold">
                      {d.toUser === userId
                        ? "you"
                        : (d.toUserProfile?.full_name ?? "?")}
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
                  <Avatar
                    userId={m.id}
                    name={m.full_name}
                    color={m.avatar_color}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {m.full_name}
                      {m.id === userId && (
                        <span className="text-ink-muted font-normal">
                          {" "}
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{m.email}</p>
                  </div>
                  {m.id === group?.created_by && (
                    <span className="text-xs font-semibold text-primary-hover bg-primary/20 px-2 py-0.5 rounded border border-ink/20">
                      Creator
                    </span>
                  )}
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
                  : (settleDebt.fromUserProfile?.full_name ?? "?")}{" "}
                pays{" "}
                {settleDebt.toUser === userId
                  ? "you"
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
          setSelectedMembers([]);
        }}
        title="Add Member"
      >
        <div className="flex flex-col gap-4">
          <UserSearchInput
            selected={selectedMembers}
            onChange={(users) =>
              setSelectedMembers(
                users.filter((u) => !existingMemberIds.has(u.id)),
              )
            }
            disabledIds={existingMemberIds}
          />
          <Button
            variant="primary"
            fullWidth
            onClick={handleAddMember}
            disabled={addingMember || selectedMembers.length === 0}
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
          loadData(true);
          if (editExpense) toast.success("Expense updated");
          else toast.success("Expense added");
        }}
        editData={editDataMemo}
      />
    </div>
  );
}
