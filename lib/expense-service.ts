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
  const { data: expenseId, error } = await supabase.rpc(
    "create_expense_with_splits",
    {
      p_group_id: data.groupId,
      p_paid_by: data.paidBy,
      p_category_id: data.categoryId,
      p_amount_toman: data.amountToman,
      p_description: data.description,
      p_expense_date: data.expenseDate,
      p_created_by: data.createdBy,
      p_splits: data.splits,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return { id: expenseId };
}
