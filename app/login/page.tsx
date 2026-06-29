"use client";

import { useRef, useState } from "react";
import { Receipt, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InstallBanner } from "@/components/ui/InstallBanner";

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

export default function LoginPage() {
  const supabaseRef = useRef(createClient());
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { data, error } = await supabaseRef.current.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      setSigningIn(false);
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="flex min-h-dvh flex-col h-full items-center justify-center px-6 bg-bg">
      <InstallBanner />
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-8 rounded-xl border-2 border-ink bg-primary px-6 py-8 shadow-[4px_4px_0px_#0D0D0D]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-surface shadow-[2px_2px_0px_#0D0D0D]">
            <Receipt size={32} className="text-ink" />
          </div>
          <h1 className="font-display text-[32px] font-bold text-ink">
            SplitMate
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            Share simplified expenses with your friends, coleagues, and every
            person you know.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-ink bg-surface px-4 py-3.5 text-sm font-semibold text-ink shadow-[4px_4px_0px_#0D0D0D] transition-all duration-150 hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-60 disabled:pointer-events-none "
        >
          {signingIn ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
