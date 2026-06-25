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
      amount_toman,
      expense_splits (
        user_id,
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
      amountToman: e.amount_toman,
      splits: (e.expense_splits ?? []).map((s) => ({
        userId: s.user_id,
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

    const userIds = new Set<string>();
    for (const d of debts) {
      userIds.add(d.fromUser);
      userIds.add(d.toUser);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_color")
      .in("id", Array.from(userIds));

    const profileMap = new Map<
      string,
      { full_name: string; avatar_color: string | null }
    >();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        full_name: p.full_name,
        avatar_color: p.avatar_color,
      });
    }

    const enrichedDebts = debts.map((d) => ({
      ...d,
      fromUserProfile: profileMap.get(d.fromUser) ?? null,
      toUserProfile: profileMap.get(d.toUser) ?? null,
    }));

    return NextResponse.json({ balances, debts: enrichedDebts });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to calculate balances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
