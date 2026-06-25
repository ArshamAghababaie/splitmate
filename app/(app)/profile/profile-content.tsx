"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type ProfileContentProps = {
  userId: string;
  userName: string;
  userEmail: string;
};

export function ProfileContent({
  userId,
  userName,
  userEmail,
}: ProfileContentProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Profile" />

      <div className="flex flex-col items-center gap-4 p-6">
        <Avatar userId={userId} name={userName} size="lg" />

        <div className="text-center">
          <h2 className="font-display text-xl font-bold">{userName}</h2>
          <p className="text-sm text-ink-muted">{userEmail}</p>
        </div>

        <Card className="w-full">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Name</span>
              <span className="font-medium">{userName}</span>
            </div>
            <div className="border-t border-ink/10" />
            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">Email</span>
              <span className="font-medium">{userEmail}</span>
            </div>
          </div>
        </Card>

        <Button
          variant="danger"
          fullWidth
          onClick={handleSignOut}
          className="mt-4 flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </Button>

        <p className="mt-8 text-xs text-ink-muted">SplitMate v0.1.0</p>
      </div>
    </div>
  );
}
