"use client";

import { useTransition } from "react";
import { UserPlus } from "lucide-react";
import { resetInviteAction } from "@/app/actions/teams";
import { CopyField } from "@/components/copy-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function InviteButton({ teamId, link, isOwner }: { teamId: string; link: string; isOwner: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <UserPlus /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Invite people to your team</DialogTitle>
          <DialogDescription>Send this link by text, chat or email. People who open it can create an account and join.</DialogDescription>
        </DialogHeader>
        <CopyField value={link} />
        <p className="text-xs text-muted-foreground">
          Don&apos;t need an account for everyone? You can also share a single retro&apos;s link. Guests join it with just their name.
        </p>
        {isOwner && (
          <Button variant="link" size="sm" className="h-auto self-start px-0 text-muted-foreground" disabled={pending} onClick={() => start(() => resetInviteAction(teamId))}>
            Make a new link (the old one stops working)
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
