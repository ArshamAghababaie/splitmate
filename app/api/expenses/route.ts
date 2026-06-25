import { createExpenseWithSplits } from "@/lib/expense-service";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 50);

    const { data: expenses, error } = await supabase
      .from("expenses")
      .select(
        `
        id,
        group_id,
        paid_by,
        amount_toman,
        description,
        expense_date,
        created_at,
        categories (name, icon),
        profiles!expenses_paid_by_fkey (id, full_name, avatar_color),
        groups (name)
      `,
      )
      .or(`paid_by.eq.${user.id},created_by.eq.${user.id}`)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("GET /api/expenses error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(expenses);
  } catch (err) {
    console.error("GET /api/expenses unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("POST /api/expenses auth error:", authError?.message ?? "no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (e) {
      console.error("POST /api/expenses invalid JSON:", e);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { groupId, paidBy, categoryId, amountToman, description, expenseDate, splits } = body;

    if (typeof amountToman !== "number" || amountToman <= 0 || !Number.isInteger(amountToman)) {
      console.error("POST /api/expenses invalid amountToman:", amountToman);
      return NextResponse.json(
        { error: "amountToman must be a positive integer" },
        { status: 400 },
      );
    }

    if (!categoryId || typeof categoryId !== "string") {
      console.error("POST /api/expenses missing or invalid categoryId:", categoryId);
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    if (!paidBy || typeof paidBy !== "string") {
      console.error("POST /api/expenses missing or invalid paidBy:", paidBy);
      return NextResponse.json(
        { error: "paidBy is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      console.error("POST /api/expenses invalid splits:", splits);
      return NextResponse.json(
        { error: "splits must be a non-empty array" },
        { status: 400 },
      );
    }

    const splitsSum = splits.reduce(
      (sum: number, s: { amountOwed: number }) => sum + (s.amountOwed ?? 0),
      0,
    );
    if (splitsSum !== amountToman) {
      console.error("POST /api/expenses splits sum mismatch:", splitsSum, "vs", amountToman);
      return NextResponse.json(
        {
          error: `Sum of splits (${splitsSum}) does not equal amountToman (${amountToman})`,
        },
        { status: 400 },
      );
    }

    const expense = await createExpenseWithSplits(supabase, {
      groupId: (groupId as string) ?? null,
      paidBy: paidBy as string,
      categoryId: categoryId as string,
      amountToman: amountToman as number,
      description: (description as string) ?? "",
      expenseDate:
        (expenseDate as string) ?? new Date().toISOString().split("T")[0],
      createdBy: user.id,
      splits: splits as { userId: string; amountOwed: number }[],
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("POST /api/expenses unexpected error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
