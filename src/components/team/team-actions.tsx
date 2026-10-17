"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteActionAction, toggleActionAction } from "@/app/actions/teams";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
import type { ActionDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const SHOWN = 6;

export function TeamActions({ actions }: { actions: ActionDTO[] }) {
  const [, start] = useTransition();
  const [all, setAll] = useState(false);
  const [list, update] = useOptimistic(actions, (state, change: { id: string; done?: boolean; remove?: boolean }) =>
    change.remove ? state.filter((a) => a.id !== change.id) : state.map((a) => (a.id === change.id ? { ...a, done: !!change.done } : a)),
  );
  if (!list.length) {
    return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">No action items yet. They show up here after your first retro.</p>;
  }
  const visible = all ? list : list.slice(0, SHOWN);
  return (
    <>
      <ul className="divide-y rounded-xl border bg-card">
        {visible.map((a) => (
          <li key={a.id} className="group flex items-start gap-3 px-4 py-3">
            <Checkbox
              checked={a.done}
              className="mt-0.5 size-5"
              aria-label={a.done ? `Mark "${a.text}" as not done` : `Mark "${a.text}" as done`}
              onCheckedChange={(v) =>
                start(async () => {
                  update({ id: a.id, done: !!v });
                  await toggleActionAction(a.id, !!v);
                })
              }
            />
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm", a.done && "text-muted-foreground line-through")}>{a.text}</div>
              {a.retroId && (
                <Link href={`/r/${a.retroId}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  From {a.retroTitle}
                </Link>
              )}
            </div>
            {a.owner && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <UserAvatar name={a.owner.name} color={a.owner.color} size={22} />
                <span className="hidden sm:inline">{a.owner.name.split(" ")[0]}</span>
              </span>
            )}
            <button
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 [@media(hover:none)]:-my-1 [@media(hover:none)]:p-2 [@media(hover:none)]:opacity-100"
              aria-label={`Delete "${a.text}"`}
              onClick={() =>
                start(async () => {
                  update({ id: a.id, remove: true });
                  await deleteActionAction(a.id);
                })
              }
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {list.length > SHOWN && (
        <button onClick={() => setAll((v) => !v)} className="mt-2 rounded-lg px-1 py-2 text-sm font-medium text-primary hover:underline">
          {all ? "Show fewer" : `Show ${list.length - SHOWN} more`}
        </button>
      )}
    </>
  );
}
