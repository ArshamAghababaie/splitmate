import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <DesktopNav />
      {children}
      <BottomNav />
    </div>
  );
}
