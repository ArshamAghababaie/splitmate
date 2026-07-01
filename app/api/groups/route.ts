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

    type ProfileRow = { id: string; full_name: string | null; avatar_color: string | null };

    const { data: memberRows } = await supabase
      .from("group_members")
      .select(`
        group_id,
        joined_at,
        profiles (id, full_name, avatar_color)
      `)
      .in("group_id", groupIds)
      .order("joined_at", { ascending: true });

    const countMap = new Map<string, number>();
    const previewMap = new Map<string, Array<{ id: string; fullName: string | null; avatarColor: string | null }>>();
    for (const row of memberRows ?? []) {
      countMap.set(row.group_id, (countMap.get(row.group_id) ?? 0) + 1);
      const existing = previewMap.get(row.group_id) ?? [];
      if (existing.length < 4) {
        const p = row.profiles as unknown as ProfileRow | null;
        if (p) {
          existing.push({ id: p.id, fullName: p.full_name ?? null, avatarColor: p.avatar_color ?? null });
          previewMap.set(row.group_id, existing);
        }
      }
    }

    const { data: pendingRows } = await supabase
      .from("group_pending_members")
      .select("group_id")
      .in("group_id", groupIds);

    const pendingMap = new Map<string, number>();
    for (const row of pendingRows ?? []) {
      pendingMap.set(row.group_id, (pendingMap.get(row.group_id) ?? 0) + 1);
    }

    const groups = data.map((gm) => ({
      ...gm.groups,
      memberCount: countMap.get(gm.group_id) ?? 0,
      pendingCount: pendingMap.get(gm.group_id) ?? 0,
      memberPreview: previewMap.get(gm.group_id) ?? [],
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
