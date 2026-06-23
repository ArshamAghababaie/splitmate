import { createExpenseWithSplits } from "@/lib/expense-service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { groupId, paidBy, categoryId, amountToman, description, expenseDate, splits } = body;

  if (typeof amountToman !== "number" || amountToman <= 0 || !Number.isInteger(amountToman)) {
    return NextResponse.json({ error: "amountToman must be a positive integer" }, { status: 400 });
  }

  if (!Array.isArray(splits) || splits.length === 0) {
    return NextResponse.json({ error: "splits must be a non-empty array" }, { status: 400 });
  }

  const splitsSum = splits.reduce((sum: number, s: { amountOwed: number }) => sum + s.amountOwed, 0);
  if (splitsSum !== amountToman) {
    return NextResponse.json(
      { error: `Sum of splits (${splitsSum}) does not equal amountToman (${amountToman})` },
      { status: 400 },
    );
  }

  try {
    const expense = await createExpenseWithSplits(supabase, {
      groupId: groupId ?? null,
      paidBy,
      categoryId,
      amountToman,
      description: description ?? "",
      expenseDate: expenseDate ?? new Date().toISOString().split("T")[0],
      createdBy: user.id,
      splits,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
