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
    .select(
      `
      user_id,
      joined_at,
      profiles (
        id,
        full_name,
        email,
        avatar_color
      )
    `,
    )
    .eq("group_id", id);

  return NextResponse.json({
    ...group,
    members: (members ?? []).map((m) => ({
      ...m.profiles,
      joinedAt: m.joined_at,
    })),
  });
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

    const { data: group, error: fetchError } = await supabase
      .from("groups")
      .select("id, created_by")
      .eq("id", id)
      .single();

    if (fetchError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the group creator can delete this group" },
        { status: 403 },
      );
    }

    const { error: deleteError } = await supabase
      .from("groups")
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
      err instanceof Error ? err.message : "Failed to delete group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
