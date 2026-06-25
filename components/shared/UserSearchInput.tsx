"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type SearchResult = {
  id: string;
  full_name: string;
  email: string;
  avatar_color: string | null;
};

type UserSearchInputProps = {
  selected: SearchResult[];
  onChange: (users: SearchResult[]) => void;
  disabledIds?: Set<string>;
};

export function UserSearchInput({ selected, onChange, disabledIds }: UserSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selected.map((u) => u.id));
  const filteredResults = results.filter((r) => !selectedIds.has(r.id));
  const isDisabled = (id: string) => disabledIds?.has(id) ?? false;

  const addUser = (user: SearchResult) => {
    onChange([...selected, user]);
    setQuery("");
    setResults([]);
  };

  const removeUser = (id: string) => {
    onChange(selected.filter((u) => u.id !== id));
  };

  return (
    <div ref={wrapperRef} className="flex flex-col gap-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full rounded-lg border-2 border-ink bg-surface-alt pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink focus:shadow-[2px_2px_0px_#FFD600] transition-all duration-150"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted animate-spin" />
        )}
      </div>

      {showResults && filteredResults.length > 0 && (
        <div className="rounded-lg border-2 border-ink bg-surface shadow-[4px_4px_0px_#0D0D0D] max-h-48 overflow-y-auto">
          {filteredResults.map((user) => {
            const disabled = isDisabled(user.id);
            return (
              <button
                key={user.id}
                onClick={() => !disabled && addUser(user)}
                disabled={disabled}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-surface-alt"}`}
              >
                <Avatar userId={user.id} name={user.full_name} size="sm" color={user.avatar_color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name}</p>
                  <p className="text-xs text-ink-muted truncate">
                    {user.email}{disabled ? " (already a member)" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showResults && query.length >= 2 && !loading && filteredResults.length === 0 && results.length === 0 && (
        <p className="text-xs text-ink-muted text-center py-2">No users found</p>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-primary/30 px-2 py-1"
            >
              <Avatar userId={user.id} name={user.full_name} size="sm" color={user.avatar_color} />
              <span className="text-xs font-medium">{user.full_name}</span>
              <button
                onClick={() => removeUser(user.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-ink/10 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
