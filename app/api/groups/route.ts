import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("group_members")
    .select(`
      group_id,
      groups (
        id,
        name,
        created_by,
        created_at
      )
    `)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name || name.length > 50) {
    return NextResponse.json(
      { error: "Name must be a non-empty string (max 50 chars)" },
      { status: 400 },
    );
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    await supabase.from("groups").delete().eq("id", group.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json(group, { status: 201 });
}
