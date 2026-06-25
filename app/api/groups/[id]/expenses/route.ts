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
        avatar_color
      ),
      expense_splits (
        user_id,
        amount_owed
      )
    `,
      )
      .eq("group_id", groupId)
      .order("expense_date", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(expenses);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch expenses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
