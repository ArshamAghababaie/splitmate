import type { SupabaseClient } from "@supabase/supabase-js";

type CreateExpenseInput = {
  groupId: string | null;
  paidBy: string;
  categoryId: string;
  amountToman: number;
  description: string;
  expenseDate: string;
  createdBy: string;
  splits: { userId: string; amountOwed: number }[];
};

export async function createExpenseWithSplits(
  supabase: SupabaseClient,
  data: CreateExpenseInput,
) {
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      group_id: data.groupId,
      paid_by: data.paidBy,
      category_id: data.categoryId,
      amount_toman: data.amountToman,
      description: data.description,
      expense_date: data.expenseDate,
      created_by: data.createdBy,
    })
    .select()
    .single();

  if (expenseError || !expense) {
    throw new Error(expenseError?.message ?? "Failed to create expense");
  }

  const splitRows = data.splits.map((s) => ({
    expense_id: expense.id,
    user_id: s.userId,
    amount_owed: s.amountOwed,
  }));

  const { error: splitsError } = await supabase
    .from("expense_splits")
    .insert(splitRows);

  if (splitsError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    throw new Error(splitsError.message);
  }

  return expense;
}
