export const AVATAR_COLORS = [
  "#FF6B6B", "#FF9F43", "#FFD93D", "#6BCB77",
  "#4D96FF", "#C77DFF", "#FF6FD8", "#00C9A7",
  "#FFA552", "#A8DADC",
];

export function getAvatarColor(userId: string): string {
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
