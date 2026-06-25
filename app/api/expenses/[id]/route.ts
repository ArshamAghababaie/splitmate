import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: expense, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error || !expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("id, created_by")
      .eq("id", id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 },
      );
    }

    if (expense.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the expense creator can delete this expense" },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing, error: fetchError } = await supabase
      .from("expenses")
      .select("id, created_by, amount_toman")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 },
      );
    }

    if (existing.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the expense creator can edit this expense" },
        { status: 403 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.description !== undefined)
      updates.description = body.description as string;
    if (body.amountToman !== undefined)
      updates.amount_toman = body.amountToman as number;
    if (body.categoryId !== undefined)
      updates.category_id = body.categoryId as string;
    if (body.expenseDate !== undefined)
      updates.expense_date = body.expenseDate as string;
    if (body.paidBy !== undefined)
      updates.paid_by = body.paidBy as string;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }
    }

    if (Array.isArray(body.splits)) {
      const amountToman =
        (updates.amount_toman as number) ?? existing.amount_toman;
      const splitsSum = (body.splits as { amountOwed: number }[]).reduce(
        (sum, s) => sum + (s.amountOwed ?? 0),
        0,
      );

      if (splitsSum !== amountToman) {
        return NextResponse.json(
          {
            error: `Sum of splits (${splitsSum}) does not equal amountToman (${amountToman})`,
          },
          { status: 400 },
        );
      }

      const { error: deleteError } = await supabase
        .from("expense_splits")
        .delete()
        .eq("expense_id", id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 },
        );
      }

      const { error: insertError } = await supabase
        .from("expense_splits")
        .insert(
          (body.splits as { userId: string; amountOwed: number }[]).map(
            (s) => ({
              expense_id: id,
              user_id: s.userId,
              amount_owed: s.amountOwed,
            }),
          ),
        );

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 },
        );
      }
    }

    const { data: updated } = await supabase
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
        categories ( name, icon ),
        profiles!expenses_paid_by_fkey ( id, full_name, avatar_color ),
        expense_splits ( user_id, amount_owed )
      `,
      )
      .eq("id", id)
      .single();

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
