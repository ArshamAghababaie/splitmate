import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const pattern = `%${q}%`;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_color")
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .neq("id", user.id)
      .limit(10);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
