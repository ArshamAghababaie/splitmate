import { User } from "lucide-react";

type AvatarSize = "sm" | "md" | "lg";

type GhostAvatarProps = {
  size?: AvatarSize;
  className?: string;
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const iconSizes: Record<AvatarSize, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

export function GhostAvatar({ size = "md", className = "" }: GhostAvatarProps) {
  return (
    <div
      className={`${sizeStyles[size]} flex items-center justify-center rounded-full border-2 border-dashed border-ink/40 bg-ink/5 text-ink/30 shrink-0 ${className}`}
    >
      <User size={iconSizes[size]} />
    </div>
  );
}
