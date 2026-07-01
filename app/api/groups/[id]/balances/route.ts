import { calculateGroupDebts, calculateBalances } from "@/lib/balance";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseWithSplits, Settlement } from "@/types";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: expenses, error: expError } = await supabase
      .from("expenses")
      .select(
        `
      id,
      paid_by,
      pending_paid_by,
      amount_toman,
      expense_splits (
        user_id,
        pending_member_id,
        amount_owed
      )
    `,
      )
      .eq("group_id", groupId);

    if (expError)
      return NextResponse.json({ error: expError.message }, { status: 500 });

    const { data: settlements, error: setError } = await supabase
      .from("settlements")
      .select("from_user, to_user, amount_toman")
      .eq("group_id", groupId);

    if (setError)
      return NextResponse.json({ error: setError.message }, { status: 500 });

    const expenseData: ExpenseWithSplits[] = (expenses ?? []).map((e) => ({
      id: e.id,
      paidBy: e.paid_by,
      pendingPaidBy: e.pending_paid_by,
      amountToman: e.amount_toman,
      splits: ((e.expense_splits ?? []) as { user_id: string | null; pending_member_id: string | null; amount_owed: number }[]).map((s) => ({
        userId: s.user_id,
        pendingMemberId: s.pending_member_id,
        amountOwed: s.amount_owed,
      })),
    }));

    const settlementData: Settlement[] = (settlements ?? []).map((s) => ({
      fromUser: s.from_user,
      toUser: s.to_user,
      amountToman: s.amount_toman,
    }));

    const balances = calculateBalances(expenseData);
    const debts = calculateGroupDebts(expenseData, settlementData);

    // Collect all member IDs to enrich
    const memberIds = new Set<string>();
    for (const b of balances) memberIds.add(b.memberId);
    for (const d of debts) {
      memberIds.add(d.fromMemberId);
      memberIds.add(d.toMemberId);
    }

    const memberIdArr = Array.from(memberIds);

    // Batch-fetch profiles and pending members
    const [{ data: profiles }, { data: pendingMembers }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_color")
        .in("id", memberIdArr),
      supabase
        .from("pending_members")
        .select("id, email")
        .in("id", memberIdArr),
    ]);

    const profileMap = new Map<string, { full_name: string; email: string; avatar_color: string | null }>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email, avatar_color: p.avatar_color });
    }
    const pendingMap = new Map<string, { email: string }>();
    for (const p of pendingMembers ?? []) {
      pendingMap.set(p.id, { email: p.email });
    }

    const enrichedBalances = balances.map((b) => {
      const profile = profileMap.get(b.memberId);
      const pending = pendingMap.get(b.memberId);
      return {
        ...b,
        isPending: !!pending,
        email: pending?.email,
        fullName: profile?.full_name ?? null,
        avatarColor: profile?.avatar_color ?? null,
      };
    });

    const enrichedDebts = debts.map((d) => {
      const fromProfile = profileMap.get(d.fromMemberId);
      const fromPending = pendingMap.get(d.fromMemberId);
      const toProfile = profileMap.get(d.toMemberId);
      const toPending = pendingMap.get(d.toMemberId);
      return {
        ...d,
        fromIsPending: !!fromPending,
        fromEmail: fromPending?.email,
        toIsPending: !!toPending,
        toEmail: toPending?.email,
        // Legacy fields retained for frontend compatibility (Part B will clean these up)
        fromUser: d.fromMemberId,
        toUser: d.toMemberId,
        fromUserProfile: fromProfile
          ? { full_name: fromProfile.full_name, avatar_color: fromProfile.avatar_color }
          : null,
        toUserProfile: toProfile
          ? { full_name: toProfile.full_name, avatar_color: toProfile.avatar_color }
          : null,
      };
    });

    return NextResponse.json({ balances: enrichedBalances, debts: enrichedDebts });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to calculate balances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
