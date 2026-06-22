import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    "User";
  const email = user.email ?? "";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {email}
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
