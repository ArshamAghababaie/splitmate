import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("group_members")
      .select(
        `
      group_id,
      groups (
        id,
        name,
        created_by,
        created_at
      )
    `,
      )
      .eq("user_id", user.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const groupIds = data.map((gm) => gm.group_id);

    const { data: memberCounts } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds);

    const countMap = new Map<string, number>();
    for (const m of memberCounts ?? []) {
      countMap.set(m.group_id, (countMap.get(m.group_id) ?? 0) + 1);
    }

    const groups = data.map((gm) => ({
      ...gm.groups,
      memberCount: countMap.get(gm.group_id) ?? 0,
    }));

    return NextResponse.json(groups);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch groups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/groups
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length === 0 ||
      name.trim().length > 50
    ) {
      return NextResponse.json(
        { error: "Invalid group name" },
        { status: 400 },
      );
    }

    // Use the RPC function that handles both inserts atomically with SECURITY DEFINER
    const { data, error } = await supabase.rpc("create_group_with_member", {
      group_name: name.trim(),
      creator_id: user.id,
    });

    if (error) {
      console.error("Create group error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
