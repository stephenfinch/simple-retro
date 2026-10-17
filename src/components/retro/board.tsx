"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ArrowRightLeft, Combine, GripVertical, MoreHorizontal, Ungroup } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COLUMN_STYLES } from "@/lib/colors";
import type { CardDTO, Column, GroupDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AddCard, Author, CardShell, CardText, HiddenCard, MyCard, VoteControl } from "./cards";
import { itemsOf } from "./items";
import { useRetro } from "./use-retro";

export function Board() {
  const { state } = useRetro();
  const columns = state.retro.columns;
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const step = state.retro.step;
  useEffect(() => {
    // a new step renders new cards; keep the column the person was looking at
    scroller.current?.children[active]?.scrollIntoView({ block: "nearest", inline: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const inner = (
    <>
      {/* On small screens columns sit side by side and scroll; these tabs show where you are. */}
      <div className="sticky top-14 z-20 -mt-1 mb-3 flex gap-1.5 overflow-x-auto bg-canvas/90 px-4 py-2 backdrop-blur scrollbar-thin sm:px-6 lg:hidden" role="tablist" aria-label="Columns">
        {columns.map((col, i) => (
          <button
            key={col.id}
            role="tab"
            aria-selected={i === active}
            onClick={() => scroller.current?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              i === active ? "border-foreground/20 bg-card font-medium shadow-xs" : "border-transparent text-muted-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", COLUMN_STYLES[col.color].dot)} />
            {col.title}
          </button>
        ))}
      </div>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const first = el.children[0] as HTMLElement | undefined;
          if (!first) return;
          const step = first.offsetWidth + 16;
          setActive(Math.max(0, Math.min(columns.length - 1, Math.round(el.scrollLeft / step))));
        }}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-10 scrollbar-thin sm:px-6 lg:grid lg:overflow-visible"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((col) => (
          <ColumnView key={col.id} column={col} />
        ))}
      </div>
    </>
  );
  return state.retro.step === "group" ? <GroupDnd>{inner}</GroupDnd> : inner;
}

function ColumnView({ column }: { column: Column }) {
  const { state } = useRetro();
  const step = state.retro.step;
  const style = COLUMN_STYLES[column.color];
  const cards = state.cards.filter((c) => c.columnId === column.id);
  const { setNodeRef, isOver } = useDroppable({ id: `drop:col:${column.id}`, disabled: step !== "group" });

  return (
    <section
      ref={setNodeRef}
      aria-label={column.title}
      className={cn(
        "flex w-[85vw] max-w-sm shrink-0 snap-center flex-col rounded-2xl border transition-colors sm:w-80 lg:w-auto lg:max-w-none",
        style.soft,
        style.border,
        isOver && "ring-3 ring-primary/30",
      )}
    >
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", style.dot)} />
          <h2 className="font-semibold">{column.title}</h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{cards.length || ""}</span>
        </div>
        {column.prompt && <p className="mt-0.5 text-sm text-muted-foreground">{column.prompt}</p>}
      </header>
      <div className="flex min-h-28 flex-1 flex-col gap-2 px-3 pb-3">
        {step === "write" && <WriteColumn column={column} cards={cards} />}
        {step === "group" && <GroupColumn column={column} />}
        {step === "vote" && <VoteColumn column={column} />}
      </div>
    </section>
  );
}

// ─── Write ──────────────────────────────────────────────────────────────────

function WriteColumn({ column, cards }: { column: Column; cards: CardDTO[] }) {
  const mine = cards.filter((c) => c.mine);
  const others = cards.filter((c) => !c.mine);
  return (
    <>
      <AddCard columnId={column.id} placeholder={mine.length ? "Add another card…" : "Add a card…"} />
      {mine.map((c) => (
        <MyCard key={c.id} card={c} />
      ))}
      {others.map((c) =>
        c.hidden ? (
          <HiddenCard key={c.id} />
        ) : (
          <CardShell key={c.id}>
            <p className="break-words whitespace-pre-wrap">{c.text}</p>
            <Author card={c} />
          </CardShell>
        ),
      )}
    </>
  );
}

// ─── Group ──────────────────────────────────────────────────────────────────

/** Prefer the card or group under the pointer over the column around it. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const inner = hits.filter((h) => !String(h.id).startsWith("drop:col:") && h.id !== `drop:card:${args.active.id}`);
  if (inner.length) return inner;
  if (hits.length) return hits;
  return rectIntersection(args);
};

function GroupDnd({ children }: { children: React.ReactNode }) {
  const { state, op } = useRetro();
  const [active, setActive] = useState<CardDTO | null>(null);
  // Mouse and touch sensors rather than pointer events: a phone cancels pointer events as soon as it starts
  // to scroll, which ended drags early. On touch, press and hold briefly to pick a card up; a quick swipe still scrolls.
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }));

  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const card = state.cards.find((c) => c.id === e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!card || !over) return;
    const [, kind, id] = over.split(":");
    if (kind === "card" && id !== card.id) {
      const target = state.cards.find((c) => c.id === id);
      if (target && (!target.groupId || target.groupId !== card.groupId)) void op("card.group", { id: card.id, targetId: id });
    } else if (kind === "group" && id !== card.groupId) {
      void op("card.group", { id: card.id, targetId: id });
    } else if (kind === "col" && (card.groupId || card.columnId !== id)) {
      void op("card.move", { id: card.id, columnId: id });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(e) => setActive(state.cards.find((c) => c.id === e.active.id) ?? null)}
      onDragCancel={() => setActive(null)}
      onDragEnd={onEnd}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active && (
          <CardShell className="max-w-xs rotate-2 cursor-grabbing shadow-lg ring-2 ring-primary/40">
            <p className="line-clamp-4 break-words whitespace-pre-wrap">{active.text}</p>
          </CardShell>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function GroupColumn({ column }: { column: Column }) {
  const { state } = useRetro();
  const items = itemsOf(state).filter((i) => i.columnId === column.id);
  if (!items.length) return <EmptyColumn text="No cards here. Drag one in if it fits better." />;
  return (
    <>
      {items.map((item) =>
        item.kind === "group" ? (
          <GroupBox key={item.id} group={state.groups.find((g) => g.id === item.id)!} cards={item.cards} />
        ) : (
          <DraggableCard key={item.id} card={item.cards[0]} />
        ),
      )}
    </>
  );
}

function DraggableCard({ card, inGroup }: { card: CardDTO; inGroup?: boolean }) {
  const { setNodeRef: dragRef, listeners, attributes, isDragging } = useDraggable({ id: card.id });
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `drop:card:${card.id}`, disabled: inGroup });
  return (
    <div ref={dropRef} className="relative">
      <div
        ref={dragRef}
        {...listeners}
        {...attributes}
        aria-roledescription="Draggable card"
        aria-label={card.text}
        className={cn(
          "group/d relative cursor-grab touch-manipulation rounded-xl border bg-card py-3 pr-11 pl-7 text-base leading-snug shadow-xs transition-shadow outline-none select-none [-webkit-touch-callout:none] focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-[15px]",
          inGroup && "shadow-none",
          isDragging && "opacity-30",
          isOver && "ring-3 ring-primary/50",
        )}
      >
        <GripVertical className="absolute top-3.5 left-2 size-4 text-muted-foreground/40 group-hover/d:text-muted-foreground" />
        <CardText card={card} />
      </div>
      <CardMenu card={card} />
    </div>
  );
}

/** Grouping without dragging: handy on phones, and for keyboard users. */
function CardMenu({ card }: { card: CardDTO }) {
  const { state, op } = useRetro();
  const items = itemsOf(state).filter((i) => i.id !== card.id && i.id !== card.groupId);
  const columns = state.retro.columns;
  const short = (t: string) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);
  const moveTo = columns.filter((c) => c.id !== card.columnId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="absolute top-1.5 right-1.5 size-9 text-muted-foreground sm:size-7" aria-label={`Options for card: ${card.text}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      {/* one flat, scrollable list: nested menus open off the edge of a phone screen */}
      <DropdownMenuContent align="end" collisionPadding={12} className="max-h-[min(70dvh,28rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto">
        {card.groupId && (
          <>
            <DropdownMenuItem onSelect={() => op("card.move", { id: card.id, columnId: card.columnId })}>
              <Ungroup /> Take out of group
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {items.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Combine className="size-4 text-muted-foreground" /> Put with…
            </DropdownMenuLabel>
            {columns.map((col) => {
              const here = items.filter((i) => i.columnId === col.id);
              if (!here.length) return null;
              return (
                <DropdownMenuGroup key={col.id}>
                  <DropdownMenuLabel className="flex items-center gap-1.5 py-1 text-xs font-normal text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", COLUMN_STYLES[col.color].dot)} />
                    {col.title}
                  </DropdownMenuLabel>
                  {here.map((i) => (
                    <DropdownMenuItem key={i.id} className="pl-6" onSelect={() => op("card.group", { id: card.id, targetId: i.id })}>
                      <span className="truncate">{short(i.kind === "group" && i.named ? i.title : i.cards[0].text)}</span>
                      {i.kind === "group" && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{i.cards.length} cards</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              );
            })}
          </>
        )}
        {moveTo.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <ArrowRightLeft className="size-4 text-muted-foreground" /> Move to column
            </DropdownMenuLabel>
            {moveTo.map((c) => (
              <DropdownMenuItem key={c.id} className="pl-6" onSelect={() => op("card.move", { id: card.id, columnId: c.id })}>
                <span className={cn("size-2 rounded-full", COLUMN_STYLES[c.color].dot)} /> {c.title}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupBox({ group, cards }: { group: GroupDTO; cards: CardDTO[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:group:${group.id}` });
  return (
    <div ref={setNodeRef} className={cn("space-y-1.5 rounded-xl border bg-card/70 p-2 shadow-xs transition-shadow", isOver && "ring-3 ring-primary/50")}>
      <GroupTitle group={group} />
      {cards.map((c) => (
        <DraggableCard key={c.id} card={c} inGroup />
      ))}
    </div>
  );
}

function GroupTitle({ group }: { group: GroupDTO }) {
  const { op } = useRetro();
  const [value, setValue] = useState(group.title);
  const [prev, setPrev] = useState(group.title);
  if (prev !== group.title) {
    setPrev(group.title);
    setValue(group.title);
  }
  const save = () => {
    if (value.trim() !== group.title) void op("group.rename", { id: group.id, title: value.trim() });
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder="Name this group…"
      aria-label="Group name"
      maxLength={120}
      className="w-full rounded-md bg-transparent px-1.5 py-1 text-base font-semibold outline-none sm:text-sm placeholder:font-normal placeholder:text-muted-foreground hover:bg-muted/60 focus:bg-muted/60"
    />
  );
}

// ─── Vote ───────────────────────────────────────────────────────────────────

function VoteColumn({ column }: { column: Column }) {
  const { state } = useRetro();
  const items = itemsOf(state).filter((i) => i.columnId === column.id);
  if (!items.length) return <EmptyColumn text="Nothing to vote on here." />;
  return (
    <>
      {items.map((item) => (
        <CardShell key={item.id} className={cn("space-y-2.5 transition-colors", item.myVotes > 0 && "border-primary/40 bg-primary/[0.03]")}>
          {item.kind === "group" ? (
            <>
              {item.named && <div className="font-semibold">{item.title}</div>}
              <ul className={cn("space-y-1.5 border-l-2 pl-3", item.named && "text-sm text-muted-foreground")}>
                {item.cards.map((c) => (
                  <li key={c.id} className="break-words whitespace-pre-wrap">
                    {c.text}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="break-words whitespace-pre-wrap">{item.title}</p>
              <Author card={item.cards[0]} />
            </>
          )}
          <div className="flex justify-end">
            <VoteControl targetId={item.id} myVotes={item.myVotes} label={item.title} />
          </div>
        </CardShell>
      ))}
    </>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return <p className="flex flex-1 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
