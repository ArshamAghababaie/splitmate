import { getAvatarColor } from "@/lib/avatar-colors";

type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = {
  userId: string;
  name: string;
  size?: AvatarSize;
  color?: string | null;
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

export function Avatar({ userId, name, size = "md", color }: AvatarProps) {
  const bgColor = color ?? getAvatarColor(userId);
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`${sizeStyles[size]} flex items-center justify-center rounded-full border-2 border-ink font-display font-bold text-ink shrink-0`}
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  );
}
