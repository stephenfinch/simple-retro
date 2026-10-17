"use client";

import { useTransition } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { deleteRetroAction } from "@/app/actions/teams";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function RetroRowMenu({ retroId, title }: { retroId: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`More options for ${title}`} disabled={pending}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            if (confirm(`Delete "${title}"? Its cards are removed. Action items stay on the team.`)) start(() => deleteRetroAction(retroId));
          }}
        >
          <Trash2 /> Delete retro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
