import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    const { data: invitation, error } = await supabase
      .from("invitations")
      .select("id, email, group_id, invited_by, expires_at, accepted_at")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 },
      );
    }

    const [{ data: group }, { data: inviter }] = await Promise.all([
      supabase
        .from("groups")
        .select("name")
        .eq("id", invitation.group_id)
        .single(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", invitation.invited_by)
        .single(),
    ]);

    return NextResponse.json({
      groupName: group?.name ?? "a group",
      invitedByName: inviter?.full_name ?? "Someone",
      email: invitation.email,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch invitation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
