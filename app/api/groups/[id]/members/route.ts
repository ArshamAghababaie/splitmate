import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_color")
      .eq("email", email)
      .single();

    if (!profile) {
      return NextResponse.json(
        {
          error: "No user with this email has signed in to SplitMate yet",
        },
        { status: 404 },
      );
    }

    const { data: existing } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", profile.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "User is already a member of this group" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: profile.id });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(profile, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
