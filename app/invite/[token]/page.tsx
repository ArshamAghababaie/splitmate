import { createClient } from "@/lib/supabase/server";
import { Receipt } from "lucide-react";
import Link from "next/link";
import GoogleSignInButton from "./GoogleSignInButton";

type InviteData = {
  groupName: string;
  invitedByName: string;
  email: string;
};

async function getInvitation(token: string): Promise<InviteData | null | "expired"> {
  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, email, group_id, invited_by, expires_at, accepted_at")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (error || !invitation) return null;

  if (new Date(invitation.expires_at) < new Date()) return "expired";

  const [{ data: group }, { data: inviter }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", invitation.group_id).single(),
    supabase.from("profiles").select("full_name").eq("id", invitation.invited_by).single(),
  ]);

  return {
    groupName: group?.name ?? "a group",
    invitedByName: inviter?.full_name ?? "Someone",
    email: invitation.email,
  };
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvitation(token);

  if (!result) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 bg-bg">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border-2 border-ink bg-surface px-6 py-8 shadow-[4px_4px_0px_#0D0D0D] text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-negative/10 shadow-[2px_2px_0px_#0D0D0D]">
              <Receipt size={32} className="text-negative" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mb-2">
              Invitation Not Found
            </h1>
            <p className="text-sm text-ink/70 mb-6">
              This invitation link is invalid or has already been used.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-ink bg-primary px-4 py-3 text-sm font-semibold text-ink shadow-[4px_4px_0px_#0D0D0D] transition-all duration-150 hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              Go to app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result === "expired") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 bg-bg">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border-2 border-ink bg-surface px-6 py-8 shadow-[4px_4px_0px_#0D0D0D] text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-negative/10 shadow-[2px_2px_0px_#0D0D0D]">
              <Receipt size={32} className="text-negative" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink mb-2">
              Invitation Expired
            </h1>
            <p className="text-sm text-ink/70 mb-6">
              This invitation link has expired. Ask to be re-invited.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-ink bg-primary px-4 py-3 text-sm font-semibold text-ink shadow-[4px_4px_0px_#0D0D0D] transition-all duration-150 hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              Go to app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-8 rounded-xl border-2 border-ink bg-primary px-6 py-8 shadow-[4px_4px_0px_#0D0D0D]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#0D0D0D]">
            <Receipt size={32} className="text-ink" />
          </div>
          <h1 className="font-display text-[28px] font-bold text-ink">
            You&apos;ve been added!
          </h1>
          <p className="mt-3 text-sm text-ink/80">
            <span className="font-semibold">{result.invitedByName}</span> has
            added you to{" "}
            <span className="font-semibold">&ldquo;{result.groupName}&rdquo;</span>
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Sign in to see your shared expenses and balance.
          </p>
        </div>

        <GoogleSignInButton />
      </div>
    </div>
  );
}
