import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: expense, error } = await supabase
    .from("expenses")
    .select(`
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
    `)
    .eq("id", id)
    .single();

  if (error || !expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json(expense);
}
