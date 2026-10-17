"use client";

import { useState } from "react";
import { ChevronDown, ListChecks, Loader2, Plus, Sparkles, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import type { ActionDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRetro } from "./use-retro";

function OwnerPicker({ ownerId, onChange, compact }: { ownerId: string | null; onChange: (id: string | null) => void; compact?: boolean }) {
  const { state } = useRetro();
  const owner = state.people.find((p) => p.id === ownerId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "sm" : "lg"} className={cn("shrink-0 text-muted-foreground", compact && "[@media(hover:none)]:h-9")} aria-label={owner ? `Owner: ${owner.name}. Change` : "Choose who does this"}>
          {owner ? <UserAvatar name={owner.name} color={owner.color} size={20} /> : <UserRound />}
          <span className={cn(compact && "hidden sm:inline")}>{owner ? owner.name.split(" ")[0] : "Who?"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {state.people.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => onChange(p.id)}>
            <UserAvatar name={p.name} color={p.color} size={20} /> {p.name}
            {p.id === state.me.id && <span className="text-muted-foreground">(me)</span>}
          </DropdownMenuItem>
        ))}
        {owner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange(null)}>No one yet</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ActionRow({ action, editable = true }: { action: ActionDTO; editable?: boolean }) {
  const { op, state } = useRetro();
  const closed = state.retro.step === "done";
  return (
    <li className="group flex items-center gap-3 py-2 [@media(hover:none)]:gap-2">
      <Checkbox
        checked={action.done}
        className="size-5"
        aria-label={action.done ? `Mark "${action.text}" as not done` : `Mark "${action.text}" as done`}
        onCheckedChange={(v) => op("action.update", { id: action.id, done: !!v })}
      />
      <span className={cn("min-w-0 flex-1 break-words", action.done && "text-muted-foreground line-through")}>{action.text}</span>
      {editable && !closed ? (
        <>
          <OwnerPicker compact ownerId={action.owner?.id ?? null} onChange={(id) => op("action.update", { id: action.id, ownerId: id })} />
          <button
            className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 [@media(hover:none)]:p-2 [@media(hover:none)]:opacity-100"
            aria-label={`Delete "${action.text}"`}
            onClick={() => op("action.delete", { id: action.id })}
          >
            <Trash2 className="size-4" />
          </button>
        </>
      ) : (
        action.owner && (
          <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            <UserAvatar name={action.owner.name} color={action.owner.color} size={20} />
            {action.owner.name.split(" ")[0]}
          </span>
        )
      )}
    </li>
  );
}

export function AddAction({ sourceId, topic }: { sourceId: string | null; topic?: string }) {
  const { op, state } = useRetro();
  const [text, setText] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const add = async (t: string) => {
    const clean = t.trim();
    if (!clean) return false;
    const r = await op("action.add", { text: clean, sourceId, ownerId });
    return r.ok;
  };
  return (
    <div className="space-y-2">
      <form
        className="flex flex-col gap-2 rounded-xl border bg-background p-1.5 focus-within:ring-3 focus-within:ring-ring/30 sm:flex-row sm:items-center"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await add(text)) {
            setText("");
            setOwnerId(null);
          }
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={topic ? "What will you do about it?" : "Add an action item…"}
          aria-label="New action item"
          maxLength={500}
          className="h-11 min-w-0 flex-1 bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground/70 sm:h-10 sm:text-[15px]"
        />
        <div className="flex items-center justify-end gap-1">
          <OwnerPicker ownerId={ownerId} onChange={setOwnerId} />
          <Button size="lg" disabled={!text.trim()}>
            <Plus /> Add
          </Button>
        </div>
      </form>
      {state.ai && sourceId && (
        <div className="flex flex-wrap items-center gap-2">
          {ideas === null ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={thinking}
              onClick={async () => {
                setThinking(true);
                const r = await op("ai.actions", { targetId: sourceId });
                setThinking(false);
                if (r.ok) setIdeas((r.result as string[]) ?? []);
              }}
            >
              {thinking ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {thinking ? "Thinking…" : "Suggest ideas"}
            </Button>
          ) : (
            ideas.map((idea) => (
              <button
                key={idea}
                onClick={async () => {
                  if (await add(idea)) setIdeas((list) => list?.filter((x) => x !== idea) ?? null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-left text-sm text-primary hover:bg-primary/10"
              >
                <Plus className="size-3.5 shrink-0" /> {idea}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Action items from earlier retros, to check in on before writing. */
export function EarlierActions() {
  const { state } = useRetro();
  const list = state.earlierActions;
  // a long list would push the board off a phone screen, so it starts folded
  const [open, setOpen] = useState(list.length <= 2);
  if (!list.length) return null;
  return (
    <div className="mx-4 mb-5 rounded-2xl border bg-card sm:mx-6">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ListChecks className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">First, a quick look back</span>
          <span className="block text-xs text-muted-foreground">
            {list.length} open action {list.length === 1 ? "item" : "items"} from earlier retros. Tick off what&apos;s done.
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="border-t px-4 py-1">
          {list.map((a) => (
            <ActionRow key={a.id} action={a} editable={false} />
          ))}
        </ul>
      )}
    </div>
  );
}
