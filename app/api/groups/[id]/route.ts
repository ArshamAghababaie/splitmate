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

  const { data: group, error } = await supabase
    .from("groups")
    .select("id, name, created_by, created_at")
    .eq("id", id)
    .single();

  if (error || !group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { data: members } = await supabase
    .from("group_members")
    .select(`
      user_id,
      joined_at,
      profiles (
        id,
        full_name,
        email,
        avatar_color
      )
    `)
    .eq("group_id", id);

  return NextResponse.json({
    ...group,
    members: (members ?? []).map((m) => ({
      ...m.profiles,
      joinedAt: m.joined_at,
    })),
  });
}
