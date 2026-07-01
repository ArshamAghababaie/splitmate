"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { UserSearchInput } from "@/components/shared/UserSearchInput";
import { createClient } from "@/lib/supabase/client";
import { fetchJSON } from "@/lib/api";

type MemberPreview = {
  id: string;
  fullName: string | null;
  avatarColor: string | null;
};

type Group = {
  id: string;
  name: string;
  memberCount: number;
  pendingCount: number;
  memberPreview: MemberPreview[];
  netBalance: number;
};

type DebtItem = {
  fromUser: string;
  toUser: string;
  amountToman: number;
};

type SelectedUser = {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string | null;
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<SelectedUser[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id ?? "";

      type ApiGroup = { id: string; name: string; memberCount: number; pendingCount: number; memberPreview: MemberPreview[] };
      const data = await fetchJSON<ApiGroup[]>("/api/groups");
      if (!Array.isArray(data)) return;

      const enriched = await Promise.all(
        data.map(async (g: ApiGroup) => {
          const balData = await fetchJSON<{ debts: DebtItem[] }>(`/api/groups/${g.id}/balances`);

          let net = 0;
          if (balData?.debts) {
            for (const d of balData.debts as DebtItem[]) {
              if (d.toUser === currentUserId) net += d.amountToman;
              if (d.fromUser === currentUserId) net -= d.amountToman;
            }
          }

          return {
            id: g.id,
            name: g.name,
            memberCount: g.memberCount,
            pendingCount: g.pendingCount ?? 0,
            memberPreview: g.memberPreview ?? [],
            netBalance: net,
          };
        }),
      );

      setGroups(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) return;
      const group = await res.json();
      const groupId = group?.id ?? group;

      if (selectedMembers.length > 0 && groupId) {
        await Promise.all(
          selectedMembers.map((m) =>
            fetch(`/api/groups/${groupId}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: m.email }),
            }),
          ),
        );
      }

      setNewName("");
      setSelectedMembers([]);
      setDrawerOpen(false);
      setLoading(true);
      load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Groups"
        action={
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-primary hover:bg-primary-hover transition-colors duration-150"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            message="No groups yet"
            subtext="Create a group to start splitting expenses with friends"
            actionLabel="Create your first group"
            onAction={() => setDrawerOpen(true)}
          />
        ) : (
          groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`}>
              <Card className="flex items-center gap-3 hover:shadow-[2px_2px_0px_#0D0D0D] hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150">
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm truncate">
                    {g.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {g.memberPreview.length > 0 && (
                      <div className="flex -space-x-2">
                        {g.memberPreview.map((m) => (
                          <Avatar
                            key={m.id}
                            userId={m.id}
                            name={m.fullName ?? ""}
                            size="sm"
                            color={m.avatarColor}
                          />
                        ))}
                        {g.memberCount > 4 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-surface-alt text-xs font-semibold text-ink-muted">
                            +{g.memberCount - 4}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-ink-muted">
                      {g.memberCount === 1 ? "1 member" : `${g.memberCount} members`}
                      {g.pendingCount > 0 ? ` · ${g.pendingCount} pending` : ""}
                    </span>
                  </div>
                </div>
                {g.netBalance !== 0 && (
                  <AmountDisplay
                    amount={g.netBalance}
                    showCurrency={false}
                    className="text-sm"
                  />
                )}
              </Card>
            </Link>
          ))
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setNewName("");
          setSelectedMembers([]);
        }}
        title="New Group"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Group name"
            placeholder="e.g. Trip to the beach"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={50}
          />
          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Add members
            </label>
            <UserSearchInput
              selected={selectedMembers}
              onChange={setSelectedMembers}
            />
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
