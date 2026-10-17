"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Pencil, Plus, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import type { CardDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRetro } from "./use-retro";

export function CardShell({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card px-3.5 py-3 text-base leading-snug shadow-xs sm:text-[15px]", className)} {...props} />;
}

export function Author({ card }: { card: CardDTO }) {
  if (!card.author) return null;
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <UserAvatar name={card.author.name} color={card.author.color} size={18} />
      {card.author.name}
    </div>
  );
}

/** Grows with its content. */
export function AutoTextarea({ className, value, ...props }: React.ComponentProps<"textarea"> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} className={cn("block w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/70", className)} {...props} />;
}

export function AddCard({ columnId, placeholder }: { columnId: string; placeholder: string }) {
  const { op, typing } = useRetro();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    const r = await op("card.add", { columnId, text: t });
    // give the text back so it isn't lost, unless they've started a new card
    if (!r.ok) setText((current) => current || t);
  };
  return (
    <div className={cn("rounded-xl border bg-card shadow-xs transition-shadow", focused && "ring-3 ring-ring/30")}>
      <AutoTextarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          typing();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        aria-label={`Add a card: ${placeholder}`}
        maxLength={2000}
        className="px-3.5 py-3 text-base sm:text-[15px]"
      />
      {(focused || text) && (
        <div className="flex items-center justify-between gap-2 border-t px-2 py-1.5">
          <span className="pl-1.5 text-[11px] text-muted-foreground">
            <kbd className="font-sans font-medium">Enter</kbd> to add · <kbd className="font-sans font-medium">Shift+Enter</kbd> for a new line
          </span>
          <Button size="sm" onMouseDown={(e) => e.preventDefault()} onClick={submit} disabled={!text.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

/** Your own card while writing: click to edit, or delete. */
export function MyCard({ card }: { card: CardDTO }) {
  const { op } = useRetro();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.text);
  const save = async () => {
    const t = text.trim();
    setEditing(false);
    if (!t) return setText(card.text);
    if (t !== card.text) await op("card.edit", { id: card.id, text: t });
  };
  if (editing) {
    return (
      <CardShell className="ring-3 ring-ring/30">
        <AutoTextarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              setText(card.text);
              setEditing(false);
            }
          }}
          aria-label="Edit card"
        />
      </CardShell>
    );
  }
  return (
    <CardShell className="group relative animate-pop-in">
      <p className="pr-12 break-words whitespace-pre-wrap [@media(hover:none)]:pr-20">{card.text}</p>
      <Author card={card} />
      <div className="absolute top-2 right-2 flex gap-0.5 [@media(hover:none)]:top-1 [@media(hover:none)]:right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground [@media(hover:none)]:p-2.5"
          aria-label="Edit card"
          onClick={() => {
            setText(card.text);
            setEditing(true);
          }}
        >
          <Pencil className="size-3.5" />
        </button>
        <button className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive [@media(hover:none)]:p-2.5" aria-label="Delete card" onClick={() => op("card.delete", { id: card.id })}>
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </CardShell>
  );
}

/** Someone else's card while it's still private. */
export function HiddenCard() {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-dashed bg-card/50 px-3.5 py-3" aria-label="A card from someone else, hidden for now">
      {[60, 40, 52].map((w, i) => (
        <span key={i} className="h-2 rounded-full bg-muted-foreground/15" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
}

export function CardText({ card }: { card: CardDTO }) {
  return (
    <>
      <p className="break-words whitespace-pre-wrap">{card.text}</p>
      <Author card={card} />
    </>
  );
}

export function VoteControl({ targetId, myVotes, label }: { targetId: string; myVotes: number; label: string }) {
  const { state, op } = useRetro();
  const left = state.me.votesLeft;
  if (!myVotes) {
    return (
      <Button variant="outline" size="sm" className="rounded-full [@media(hover:none)]:h-10 [@media(hover:none)]:px-4" disabled={!left} onClick={() => op("vote.add", { targetId })} aria-label={`Vote for: ${label}`}>
        <ThumbsUp /> Vote
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-primary/10 p-0.5 text-primary [@media(hover:none)]:[&_button]:size-9">
      <Button variant="ghost" size="icon-sm" className="rounded-full hover:bg-primary/15" onClick={() => op("vote.remove", { targetId })} aria-label={`Remove a vote from: ${label}`}>
        <Minus />
      </Button>
      <span className="min-w-5 text-center text-sm font-semibold tabular-nums" aria-label={`${myVotes} of your votes`}>
        {myVotes}
      </span>
      <Button variant="ghost" size="icon-sm" className="rounded-full hover:bg-primary/15" disabled={!left} onClick={() => op("vote.add", { targetId })} aria-label={`Add another vote to: ${label}`}>
        <Plus />
      </Button>
    </div>
  );
}
