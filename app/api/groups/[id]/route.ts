import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
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

    // Fetch regular members
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

    type ProfileRow = { id: string; full_name: string; email: string; avatar_color: string | null };
    const regularMembers = (members ?? []).map((m) => {
      const p = m.profiles as unknown as ProfileRow | null;
      return {
        id: p?.id ?? "",
        fullName: p?.full_name ?? null,
        email: p?.email ?? "",
        avatarColor: p?.avatar_color ?? null,
        isPending: false,
      };
    });

    // Fetch pending members
    const { data: pendingRows } = await supabase
      .from("group_pending_members")
      .select(
        `
        pending_member_id,
        pending_members (
          id,
          email
        )
      `,
      )
      .eq("group_id", id);

    const pendingMembers = (pendingRows ?? []).map((row) => {
      const pm = row.pending_members as unknown as { id: string; email: string } | null;
      return {
        id: pm?.id ?? "",
        fullName: null,
        email: pm?.email ?? "",
        avatarColor: null,
        isPending: true,
      };
    });

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        createdBy: group.created_by,
        createdAt: group.created_at,
      },
      members: [...regularMembers, ...pendingMembers],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
