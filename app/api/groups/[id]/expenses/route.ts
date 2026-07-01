import { createClient } from "@/lib/supabase/server";
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

    const { data: expenses, error } = await supabase
      .from("expenses")
      .select(
        `
      id,
      group_id,
      paid_by,
      pending_paid_by,
      category_id,
      amount_toman,
      description,
      expense_date,
      created_by,
      created_at,
      categories (
        name,
        icon
      ),
      profiles!expenses_paid_by_fkey (
        id,
        full_name,
        email,
        avatar_color
      ),
      expense_splits (
        user_id,
        pending_member_id,
        amount_owed
      )
    `,
      )
      .eq("group_id", groupId)
      .order("expense_date", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Collect all pending member IDs (from splits and payers)
    const pendingIds = new Set<string>();
    for (const exp of expenses ?? []) {
      if (exp.pending_paid_by) pendingIds.add(exp.pending_paid_by);
      for (const split of (exp.expense_splits ?? []) as { user_id: string | null; pending_member_id: string | null; amount_owed: number }[]) {
        if (split.pending_member_id) pendingIds.add(split.pending_member_id);
      }
    }

    const pendingMap = new Map<string, string>();
    if (pendingIds.size > 0) {
      const { data: pendingMembers } = await supabase
        .from("pending_members")
        .select("id, email")
        .in("id", Array.from(pendingIds));
      for (const pm of pendingMembers ?? []) {
        pendingMap.set(pm.id, pm.email);
      }
    }

    const result = (expenses ?? []).map((exp) => {
      const splits = ((exp.expense_splits ?? []) as { user_id: string | null; pending_member_id: string | null; amount_owed: number }[]).map((split) => {
        if (split.user_id) {
          return {
            userId: split.user_id,
            pendingMemberId: null,
            isPending: false,
            amountOwed: split.amount_owed,
          };
        }
        return {
          userId: null,
          pendingMemberId: split.pending_member_id,
          email: pendingMap.get(split.pending_member_id!) ?? null,
          isPending: true,
          amountOwed: split.amount_owed,
        };
      });

      // Build typed PayerInfo
      let payer: {
        id: string;
        fullName: string | null;
        email: string | null;
        avatarColor: string | null;
        isPending: boolean;
      } | null = null;

      if (exp.paid_by && exp.profiles) {
        const profile = exp.profiles as unknown as { id: string; full_name: string; email: string | null; avatar_color: string | null };
        payer = {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email ?? null,
          avatarColor: profile.avatar_color,
          isPending: false,
        };
      } else if (exp.pending_paid_by) {
        payer = {
          id: exp.pending_paid_by,
          fullName: null,
          email: pendingMap.get(exp.pending_paid_by) ?? null,
          avatarColor: null,
          isPending: true,
        };
      }

      return {
        ...exp,
        expense_splits: splits,
        payer,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch expenses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
