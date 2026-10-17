"use client";

import { useState, useTransition } from "react";
import { Settings } from "lucide-react";
import { deleteTeamAction, removeMemberAction, renameTeamAction } from "@/app/actions/teams";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";

type Member = { id: string; name: string; color: string; email: string | null; role: "owner" | "member" };

export function TeamSettings({ teamId, name, members, meId, isOwner }: { teamId: string; name: string; members: Member[]; meId: string; isOwner: boolean }) {
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Team settings">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Team settings</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            start(() => renameTeamAction(teamId, value));
          }}
        >
          <Label htmlFor="team-name">Team name</Label>
          <div className="flex gap-2">
            <Input id="team-name" value={value} onChange={(e) => setValue(e.target.value)} className="h-10" />
            <Button size="lg" className="h-10 px-4" disabled={pending || !value.trim() || value === name}>
              Save
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          <Label>People</Label>
          <ul className="divide-y rounded-xl border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <UserAvatar name={m.name} color={m.color} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {m.name} {m.id === meId && <span className="font-normal text-muted-foreground">(you)</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.role === "owner" ? "Owner" : m.email}</div>
                </div>
                {isOwner && m.id !== meId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Remove ${m.name} from the team?`)) start(() => removeMemberAction(teamId, m.id));
                    }}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (confirm("Leave this team? You'll need a new invite to come back.")) start(() => removeMemberAction(teamId, meId));
            }}
          >
            Leave team
          </Button>
          {isOwner && (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (confirm(`Delete "${name}" and all its retros? This can't be undone.`)) start(() => deleteTeamAction(teamId));
              }}
            >
              Delete team
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
