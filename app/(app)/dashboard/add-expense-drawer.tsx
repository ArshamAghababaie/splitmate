"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { CategoryPicker } from "@/components/shared/CategoryPicker";
import { SplitTypeSelector } from "@/components/shared/SplitTypeSelector";
import { formatAmount } from "@/lib/format";

type Category = { id: string; name: string; icon: string };
type Group = { id: string; name: string };
type Member = { id: string; full_name: string; email: string; avatar_color?: string | null };

type EditData = {
  id: string;
  description: string;
  amountToman: number;
  categoryId: string;
  paidBy: string;
  groupId: string;
  expenseDate: string;
  splits: { userId: string; amountOwed: number }[];
};

type AddExpenseDrawerProps = {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  userId: string;
  prefilledGroupId?: string;
  onSuccess?: () => void;
  editData?: EditData;
};

export function AddExpenseDrawer({
  open,
  onClose,
  groups,
  userId,
  prefilledGroupId,
  onSuccess,
  editData,
}: AddExpenseDrawerProps) {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groupId, setGroupId] = useState(prefilledGroupId ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState(userId);
  const [splitType, setSplitType] = useState<"equal" | "custom" | "percentage">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [percentageSplits, setPercentageSplits] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefilledGroupId) setGroupId(prefilledGroupId);
  }, [prefilledGroupId]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/categories")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }
    fetch(`/api/groups/${groupId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.members) setMembers(data.members);
      })
      .catch(() => {});
  }, [groupId]);

  const resetForm = useCallback(() => {
    setStep(1);
    setAmount("");
    setDescription("");
    setCategoryId("");
    setGroupId(prefilledGroupId ?? "");
    setPaidBy(userId);
    setSplitType("equal");
    setCustomSplits({});
    setPercentageSplits({});
    setError("");
    setSubmitting(false);
  }, [prefilledGroupId, userId]);

  useEffect(() => {
    if (!open) {
      resetForm();
    } else if (editData) {
      setAmount(String(editData.amountToman));
      setDescription(editData.description);
      setCategoryId(editData.categoryId);
      setPaidBy(editData.paidBy);
      setGroupId(editData.groupId);
      setSplitType("custom");
      const custom: Record<string, string> = {};
      for (const s of editData.splits) {
        custom[s.userId] = String(s.amountOwed);
      }
      setCustomSplits(custom);
    }
  }, [open, resetForm, editData]);

  const amountNum = parseInt(amount, 10) || 0;

  const computedSplits = (): { userId: string; amountOwed: number }[] => {
    const splitUsers = groupId ? members.map((m) => m.id) : [userId];
    if (splitUsers.length === 0) return [];

    if (splitType === "equal") {
      const base = Math.floor(amountNum / splitUsers.length);
      const remainder = amountNum % splitUsers.length;
      return splitUsers.map((uid, i) => ({
        userId: uid,
        amountOwed: base + (i < remainder ? 1 : 0),
      }));
    }

    if (splitType === "custom") {
      return splitUsers.map((uid) => ({
        userId: uid,
        amountOwed: parseInt(customSplits[uid] ?? "0", 10) || 0,
      }));
    }

    // percentage
    return splitUsers.map((uid) => {
      const pct = parseFloat(percentageSplits[uid] ?? "0") || 0;
      return {
        userId: uid,
        amountOwed: Math.round((amountNum * pct) / 100),
      };
    });
  };

  const splitsTotal = computedSplits().reduce((s, x) => s + x.amountOwed, 0);
  const splitValid = splitsTotal === amountNum && amountNum > 0;

  const canProceedStep1 = amountNum > 0 && description.trim().length > 0 && categoryId;
  const canProceedStep2 = splitValid;

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.full_name ?? "You";

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const isEditing = !!editData;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const url = isEditing
        ? `/api/expenses/${editData.id}`
        : "/api/expenses";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: groupId || null,
          paidBy,
          categoryId,
          amountToman: amountNum,
          description: description.trim(),
          expenseDate: isEditing
            ? editData.expenseDate
            : new Date().toISOString().split("T")[0],
          splits: computedSplits(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = isEditing
          ? "Failed to update expense"
          : "Failed to create expense";
        try {
          const data = JSON.parse(text);
          message = data.error || message;
        } catch {
          console.error("Non-JSON error response:", text);
        }
        throw new Error(message);
      }

      onClose();
      if (onSuccess) onSuccess();
      else window.location.reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isEditing
            ? "Failed to update expense"
            : "Failed to create expense",
      );
      setSubmitting(false);
    }
  };

  const stepTitle = step === 1
    ? (isEditing ? "Edit Expense" : "Add Expense")
    : step === 2 ? "Split" : "Confirm";

  return (
    <Drawer open={open} onClose={onClose} title={stepTitle}>
      <div className="flex flex-col gap-4">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-positive" : "w-2 bg-surface-alt"
              } border border-ink/20`}
            />
          ))}
        </div>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <>
            <div className="text-center">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAmount(val);
                }}
                className="w-full bg-transparent text-center font-display text-5xl font-bold text-ink placeholder:text-ink-muted/30 focus:outline-none"
              />
              <p className="text-sm text-ink-muted mt-1">Toman</p>
            </div>

            <Input
              label="Description"
              placeholder="e.g. Pizza dinner"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Category
              </label>
              <CategoryPicker
                categories={categories}
                selected={categoryId}
                onSelect={setCategoryId}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Who paid?
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(groupId && members.length > 0 ? members : [{ id: userId, full_name: "You", avatar_color: null }]).map(
                  (m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaidBy(m.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg p-2 min-w-15 transition-all duration-150 ${
                        paidBy === m.id
                          ? "border-2 border-ink bg-primary shadow-[2px_2px_0px_#0D0D0D]"
                          : "border-2 border-transparent hover:border-ink/30"
                      }`}
                    >
                      <Avatar
                        userId={m.id}
                        name={m.full_name}
                        size="sm"
                        color={m.avatar_color}
                      />
                      <span className="text-[10px] font-medium text-ink truncate max-w-14">
                        {m.id === userId ? "You" : m.full_name.split(" ")[0]}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Group
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border-2 border-ink bg-surface-alt px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-ink focus:shadow-[2px_2px_0px_#FFD600] transition-all duration-150"
              >
                <option value="">No group (personal)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              fullWidth
              disabled={!canProceedStep1}
              onClick={() => {
                setError("");
                setStep(2);
              }}
              className="flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </>
        )}

        {/* STEP 2: Split */}
        {step === 2 && (
          <>
            <Card className="text-center py-2">
              <p className="text-xs text-ink-muted">Splitting</p>
              <p className="font-display text-xl font-bold">
                {formatAmount(amountNum)} <span className="text-sm font-normal text-ink-muted">Toman</span>
              </p>
            </Card>

            {groupId && members.length > 1 && (
              <SplitTypeSelector value={splitType} onChange={(t) => {
                setSplitType(t);
                setCustomSplits({});
                setPercentageSplits({});
              }} />
            )}

            <div className="space-y-2">
              {(groupId ? members : [{ id: userId, full_name: "You", avatar_color: null }]).map(
                (m) => {
                  const splits = computedSplits();
                  const mySplit = splits.find((s) => s.userId === m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border-2 border-ink/20 bg-surface p-3"
                    >
                      <Avatar
                        userId={m.id}
                        name={m.full_name}
                        size="sm"
                        color={m.avatar_color}
                      />
                      <span className="flex-1 text-sm font-medium truncate">
                        {m.id === userId ? "You" : m.full_name}
                      </span>

                      {splitType === "equal" && (
                        <span className="font-display text-sm font-bold">
                          {formatAmount(mySplit?.amountOwed ?? 0)}
                        </span>
                      )}

                      {splitType === "custom" && (
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={customSplits[m.id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setCustomSplits((prev) => ({ ...prev, [m.id]: val }));
                          }}
                          className="w-24 rounded-lg border-2 border-ink bg-surface-alt px-2 py-1 text-right font-display text-sm font-bold focus:outline-none focus:shadow-[2px_2px_0px_#FFD600]"
                        />
                      )}

                      {splitType === "percentage" && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={percentageSplits[m.id] ?? ""}
                            onChange={(e) => {
                              setPercentageSplits((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }));
                            }}
                            className="w-16 rounded-lg border-2 border-ink bg-surface-alt px-2 py-1 text-right font-display text-sm font-bold focus:outline-none focus:shadow-[2px_2px_0px_#FFD600]"
                          />
                          <span className="text-xs text-ink-muted">%</span>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>

            {splitType !== "equal" && (
              <p
                className={`text-xs font-medium text-center ${
                  splitValid ? "text-positive" : "text-negative"
                }`}
              >
                Total: {formatAmount(splitsTotal)} / {formatAmount(amountNum)} Toman
                {splitValid ? " ✓" : " — must equal total"}
              </p>
            )}

            {error && (
              <p className="text-sm text-negative font-medium">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Back
              </Button>
              <Button
                variant="primary"
                fullWidth
                disabled={!canProceedStep2}
                onClick={() => {
                  setError("");
                  setStep(3);
                }}
                className="flex items-center justify-center gap-2"
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </>
        )}

        {/* STEP 3: Confirm */}
        {step === 3 && (
          <>
            <Card>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Description</span>
                  <span className="font-medium">{description}</span>
                </div>
                <div className="border-t border-ink/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Amount</span>
                  <AmountDisplay amount={amountNum} className="text-sm" />
                </div>
                <div className="border-t border-ink/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Category</span>
                  <span className="font-medium">{selectedCategory?.name ?? "—"}</span>
                </div>
                <div className="border-t border-ink/10" />
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Paid by</span>
                  <span className="font-medium">{paidBy === userId ? "You" : getMemberName(paidBy)}</span>
                </div>
                {groupId && (
                  <>
                    <div className="border-t border-ink/10" />
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-muted">Group</span>
                      <span className="font-medium">
                        {groups.find((g) => g.id === groupId)?.name ?? "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <div>
              <p className="text-xs font-semibold text-ink-muted mb-2">Split preview</p>
              <div className="space-y-1.5">
                {computedSplits().map((s) => (
                  <div key={s.userId} className="flex items-center justify-between text-sm">
                    <span>{s.userId === userId ? "You" : getMemberName(s.userId)}</span>
                    <span className="font-display font-bold">
                      {formatAmount(s.amountOwed)} Toman
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-negative font-medium">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep(2)}
                className="flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Back
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditing ? "Save Changes" : "Add Expense"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
