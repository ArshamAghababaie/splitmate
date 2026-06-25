import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { groupId, fromUser, toUser, amountToman } = body;

    if (fromUser === toUser) {
      return NextResponse.json(
        { error: "fromUser and toUser must differ" },
        { status: 400 },
      );
    }

    if (
      typeof amountToman !== "number" ||
      amountToman <= 0 ||
      !Number.isInteger(amountToman)
    ) {
      return NextResponse.json(
        { error: "amountToman must be a positive integer" },
        { status: 400 },
      );
    }

    if (user.id !== fromUser && user.id !== toUser) {
      return NextResponse.json(
        { error: "You must be either the sender or receiver" },
        { status: 403 },
      );
    }

    const { data: settlement, error } = await supabase
      .from("settlements")
      .insert({
        group_id: groupId ?? null,
        from_user: fromUser,
        to_user: toUser,
        amount_toman: amountToman,
        created_by: user.id,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(settlement, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create settlement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
