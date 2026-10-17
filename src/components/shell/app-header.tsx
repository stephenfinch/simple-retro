import { Logo } from "@/components/brand";
import type { CurrentUser } from "@/server/auth";
import { UserMenu } from "./user-menu";

export function AppHeader({ user, children }: { user: CurrentUser; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Logo href="/home" />
        <div className="flex-1">{children}</div>
        <UserMenu user={{ name: user.name, email: user.email, color: user.color, isGuest: user.isGuest }} />
      </div>
    </header>
  );
}
