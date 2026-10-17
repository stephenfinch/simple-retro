"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Monitor, Moon, Pencil, Sun, Users } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { renameSelfAction } from "@/app/actions/teams";
import { useTheme } from "@/components/theme";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ user }: { user: { name: string; email: string | null; color: string; isGuest: boolean } }) {
  const { theme, setTheme } = useTheme();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(user.name);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Your account">
            <UserAvatar name={user.name} color={user.color} size={32} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="font-medium text-foreground">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.isGuest ? "Guest" : user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!user.isGuest && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/home?all=1">
                  <Users /> Your teams
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil /> Change your name
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <DropdownMenuRadioItem value="light">
              <Sun /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor /> Match my device
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          {user.isGuest ? (
            <DropdownMenuItem asChild>
              <Link href="/signup">Create an account</Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => void logoutAction()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await renameSelfAction(name);
              setRenaming(false);
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Your name</DialogTitle>
            </DialogHeader>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-10" />
            <DialogFooter>
              <Button type="submit" size="lg" disabled={!name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
