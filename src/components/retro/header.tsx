"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Crown, Link2, MoreHorizontal, Settings2, UserRoundCog, WifiOff } from "lucide-react";
import { CopyField } from "@/components/copy-field";
import { UserMenu } from "@/components/shell/user-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { useRetro } from "./use-retro";

export function TopBar({ link, user }: { link: string; user: { name: string; email: string | null; color: string; isGuest: boolean } }) {
  const { state, connected } = useRetro();
  const { retro, me } = state;
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {me.isTeamMember ? (
          <Button asChild variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
            <Link href={`/t/${retro.teamId}`} aria-label={`Back to ${retro.teamName}`}>
              <ArrowLeft />
              <span className="hidden max-w-40 truncate sm:inline">{retro.teamName}</span>
            </Link>
          </Button>
        ) : (
          <span className="hidden max-w-40 truncate pl-2 text-sm text-muted-foreground sm:inline">{retro.teamName}</span>
        )}
        <span className="hidden h-5 w-px bg-border sm:block" />
        <h1 className="min-w-0 flex-1 truncate font-semibold">{retro.title}</h1>
        {!connected && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <WifiOff className="size-3.5" /> Reconnecting…
          </span>
        )}
        <People />
        {retro.step !== "done" && <ShareButton link={link} />}
        <RetroMenu link={link} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

function People() {
  const { state } = useRetro();
  const people = state.people.filter((p) => p.online);
  const shown = people.slice(0, 5);
  const showReady = state.retro.step !== "discuss" && state.retro.step !== "done";
  return (
    <div className="hidden items-center -space-x-1.5 sm:flex" aria-label={`${people.length} here now`}>
      {shown.map((p) => (
        <Tooltip key={p.id}>
          <TooltipTrigger asChild>
            <span className="relative">
              <UserAvatar name={p.name} color={p.color} size={30} ring />
              {p.id === state.retro.facilitatorId && <Crown className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 fill-amber-400 text-amber-500" />}
              {showReady && p.ready && (
                <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                  <Check className="size-2.5 text-white" strokeWidth={3} />
                </span>
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {p.name}
            {p.id === state.retro.facilitatorId ? " · facilitator" : ""}
            {showReady && p.ready ? " · done" : ""}
          </TooltipContent>
        </Tooltip>
      ))}
      {people.length > shown.length && (
        <span className="flex size-[30px] items-center justify-center rounded-full bg-muted text-xs font-semibold ring-2 ring-background">+{people.length - shown.length}</span>
      )}
    </div>
  );
}

function ShareButton({ link }: { link: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" className="shrink-0" aria-label="Invite">
          <Link2 /> <span className="hidden sm:inline">Invite</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,26rem)] space-y-3">
        <div>
          <div className="font-medium">Invite people to this retro</div>
          <p className="text-sm text-muted-foreground">Anyone with this link can join. They only need to type their name.</p>
        </div>
        <CopyField value={link} />
      </PopoverContent>
    </Popover>
  );
}

function RetroMenu({ link }: { link: string }) {
  const { state, op } = useRetro();
  const { me, retro } = state;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const others = state.people.filter((p) => p.id !== me.id);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Retro options">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(link)}>
            <Link2 /> Copy link to this retro
          </DropdownMenuItem>
          {me.isFacilitator && retro.step !== "done" && (
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <Settings2 /> Retro settings
            </DropdownMenuItem>
          )}
          {me.isFacilitator && others.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserRoundCog /> Let someone else lead
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {others.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => op("facilitator.give", { userId: p.id })}>
                    <UserAvatar name={p.name} color={p.color} size={20} /> {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {!me.isFacilitator && me.canFacilitate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => op("facilitator.take")}>
                <Crown /> Lead this retro instead
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {me.isFacilitator && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  );
}

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, op } = useRetro();
  const [title, setTitle] = useState(state.retro.title);
  const [settings, setSettings] = useState(state.retro.settings);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setTitle(state.retro.title);
          setSettings(state.retro.settings);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await op("retro.update", { title, settings });
            if (r.ok) onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Retro settings</DialogTitle>
            <DialogDescription>Changes apply for everyone right away.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rs-title">Name</Label>
            <Input id="rs-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="rs-votes">Votes per person</Label>
            <Input
              id="rs-votes"
              type="number"
              min={1}
              max={20}
              value={settings.votes}
              onChange={(e) => setSettings({ ...settings, votes: Number(e.target.value) })}
              className={cn("h-10 w-20 text-center")}
            />
          </div>
          <label className="flex items-center justify-between gap-4 text-sm font-medium">
            Show who wrote each card
            <Switch checked={settings.showAuthors} onCheckedChange={(v) => setSettings({ ...settings, showAuthors: v })} />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm font-medium">
            Keep cards private while writing
            <Switch checked={settings.hideWhileWriting} onCheckedChange={(v) => setSettings({ ...settings, hideWhileWriting: v })} />
          </label>
          <DialogFooter>
            <Button size="lg" disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
