"use client";

import { ArrowLeft, ArrowRight, ListChecks, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COLUMN_STYLES } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { ActionRow, AddAction } from "./action-items";
import { Author } from "./cards";
import { rankedItems } from "./items";
import { useRetro } from "./use-retro";

export function Discuss() {
  const { state, op } = useRetro();
  const items = rankedItems(state);
  const { me, retro } = state;
  const index = Math.max(0, items.findIndex((i) => i.id === retro.focusId));
  const focus = items[index];
  const column = focus ? retro.columns.find((c) => c.id === focus.columnId) : null;
  const actions = state.actions.filter((a) => focus && a.sourceId === focus.id);
  const otherActions = state.actions.filter((a) => !focus || a.sourceId !== focus.id);

  if (!focus || !column) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-muted-foreground">There are no cards to discuss. You can still add action items below, or finish the retro.</p>
        <div className="mt-6 text-left">
          <AddAction sourceId={null} />
          <ul className="mt-3 divide-y">
            {state.actions.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const style = COLUMN_STYLES[column.color];
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-5 pb-10 sm:px-6 sm:pt-6 lg:grid-cols-[300px_1fr] lg:pb-16">
      <aside className="order-2 lg:order-1">
        <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Topics, most votes first{me.isFacilitator && <span className="font-normal normal-case lg:hidden"> · tap one to jump to it</span>}
        </h3>
        <ol className="space-y-1">
          {items.map((item, i) => {
            const col = retro.columns.find((c) => c.id === item.columnId);
            const current = item.id === focus.id;
            const count = state.actions.filter((a) => a.sourceId === item.id).length;
            const Comp = me.isFacilitator ? "button" : "div";
            return (
              <li key={item.id}>
                <Comp
                  {...(me.isFacilitator ? { onClick: () => op("focus.set", { targetId: item.id }) } : {})}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    current ? "bg-card font-medium shadow-xs ring-1 ring-primary/40" : "text-muted-foreground",
                    me.isFacilitator && !current && "hover:bg-card/70 hover:text-foreground",
                    i < index && !current && "opacity-70",
                  )}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", col && COLUMN_STYLES[col.color].dot)} />
                  <span className="line-clamp-2 min-w-0 flex-1">{item.title}</span>
                  {count > 0 && (
                    <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400" title={`${count} action items`}>
                      <ListChecks className="size-3.5" />
                      {count}
                    </span>
                  )}
                  <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs tabular-nums">
                    <ThumbsUp className="size-3" />
                    {item.votes}
                  </span>
                </Comp>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="order-1 space-y-5 lg:order-2" aria-live="polite">
        <div className="hidden text-sm text-muted-foreground lg:block">
          Topic {index + 1} of {items.length}
        </div>
        <article className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", style.border, style.soft, style.text)}>
              <span className={cn("size-1.5 rounded-full", style.dot)} />
              {column.title}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <ThumbsUp className="size-3" /> {focus.votes} {focus.votes === 1 ? "vote" : "votes"}
            </span>
          </div>
          {focus.kind === "group" ? (
            <>
              {focus.named && <h2 className="mb-4 text-2xl font-semibold tracking-tight text-balance">{focus.title}</h2>}
              <ul className="space-y-2.5">
                {focus.cards.map((c) => (
                  <li key={c.id} className={cn("rounded-xl border bg-background/60 px-4 py-3 text-base leading-snug sm:text-[17px]", !focus.named && "sm:text-xl")}>
                    <p className="break-words whitespace-pre-wrap">{c.text}</p>
                    <Author card={c} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-xl leading-snug font-medium tracking-tight break-words whitespace-pre-wrap sm:text-2xl">{focus.title}</h2>
              <Author card={focus.cards[0]} />
            </>
          )}
        </article>

        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <h3 className="mb-1 font-semibold">What will you do about it?</h3>
          <p className="mb-4 text-sm text-muted-foreground">Add a next step and pick who takes it. It&apos;s fine to have none.</p>
          {actions.length > 0 && (
            <ul className="mb-3 divide-y">
              {actions.map((a) => (
                <ActionRow key={a.id} action={a} />
              ))}
            </ul>
          )}
          <AddAction key={focus.id} sourceId={focus.id} topic={focus.title} />
        </div>

        {me.isFacilitator && (
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="lg" disabled={index === 0} onClick={() => op("focus.set", { targetId: items[index - 1].id })}>
              <ArrowLeft /> Previous
            </Button>
            {index < items.length - 1 ? (
              // on phones, Next topic is in the bottom bar
              <Button size="xl" className="hidden lg:inline-flex" onClick={() => op("focus.set", { targetId: items[index + 1].id })}>
                Next topic <ArrowRight />
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">That was the last topic.</span>
            )}
          </div>
        )}

        {otherActions.length > 0 && (
          <details className="rounded-2xl border bg-card/60 px-5 py-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Action items from other topics ({otherActions.length})</summary>
            <ul className="mt-2 divide-y">
              {otherActions.map((a) => (
                <ActionRow key={a.id} action={a} />
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
