"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2, PartyPopper, RotateCcw, Sparkles, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COLUMN_STYLES } from "@/lib/colors";
import type { RetroStateDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActionRow } from "./action-items";
import { rankedItems } from "./items";
import { useRetro } from "./use-retro";

function asText(state: RetroStateDTO) {
  const items = rankedItems(state);
  const lines = [`# ${state.retro.title}`, ""];
  if (state.retro.summary) lines.push(state.retro.summary, "");
  lines.push("## Action items");
  if (state.actions.length) for (const a of state.actions) lines.push(`- [${a.done ? "x" : " "}] ${a.text}${a.owner ? ` (${a.owner.name})` : ""}`);
  else lines.push("(none)");
  for (const col of state.retro.columns) {
    lines.push("", `## ${col.title}`);
    for (const item of items.filter((i) => i.columnId === col.id)) {
      const votes = item.votes ? ` (${item.votes} ${item.votes === 1 ? "vote" : "votes"})` : "";
      if (item.kind === "group") {
        lines.push(`- ${item.named ? item.title : "Group"}${votes}`);
        for (const c of item.cards) lines.push(`  - ${c.text}`);
      } else lines.push(`- ${item.title}${votes}`);
    }
  }
  return lines.join("\n");
}

export function Summary() {
  const { state, op } = useRetro();
  const { retro, me } = state;
  const items = rankedItems(state);
  const [copied, setCopied] = useState(false);
  const [writing, setWriting] = useState(false);
  const date = new Date(retro.closedAt ?? retro.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-20 sm:px-6">
      <div className="text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-sm">
          <PartyPopper className="size-7" />
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">That&apos;s a wrap!</h2>
        <p className="mt-1 text-muted-foreground">{date}</p>
        <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
          {[
            ["people", state.people.length],
            ["cards", state.cards.length],
            ["action items", state.actions.length],
          ].map(([label, n]) => (
            <div key={label} className="rounded-xl border bg-card px-3 py-3">
              <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
              <dt className="text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h3 className="font-semibold">Action items</h3>
            {state.actions.length ? (
              <>
                <p className="mb-2 text-sm text-muted-foreground">These stay on your team page until they&apos;re done.</p>
                <ul className="divide-y">
                  {state.actions.map((a) => (
                    <ActionRow key={a.id} action={a} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No action items this time. That&apos;s okay.</p>
            )}
          </div>

          {(retro.summary || state.ai) && (
            <div className="rounded-2xl border bg-card p-5 shadow-xs">
              <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" /> Summary
              </h3>
              {retro.summary ? (
                <div className="space-y-3 text-[15px] leading-relaxed">
                  {retro.summary.split(/\n{2,}/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">Let AI write a short recap of what you talked about and agreed on.</p>
                  <Button
                    variant="outline"
                    disabled={writing}
                    onClick={async () => {
                      setWriting(true);
                      await op("ai.summary");
                      setWriting(false);
                    }}
                  >
                    {writing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    {writing ? "Writing…" : "Write a summary"}
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h3 className="mb-3 font-semibold">What came up</h3>
          {items.length ? (
            <ol className="space-y-2.5">
              {items.map((item) => {
                const col = retro.columns.find((c) => c.id === item.columnId);
                const acts = state.actions.filter((a) => a.sourceId === item.id);
                return (
                  <li key={item.id} className="flex gap-3">
                    <span className={cn("mt-2 size-2 shrink-0 rounded-full", col && COLUMN_STYLES[col.color].dot)} title={col?.title} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] break-words">
                        {item.title}
                        {item.kind === "group" && <span className="text-muted-foreground"> · {item.cards.length} cards</span>}
                      </div>
                      {acts.map((a) => (
                        <div key={a.id} className="mt-0.5 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                          <Check className="size-3.5" /> {a.text}
                        </div>
                      ))}
                    </div>
                    {item.votes > 0 && (
                      <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <ThumbsUp className="size-3" /> {item.votes}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No cards were added.</p>
          )}
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {me.isTeamMember && (
          <Button asChild size="xl">
            <Link href={`/t/${retro.teamId}`}>
              <ArrowLeft /> Back to {retro.teamName}
            </Link>
          </Button>
        )}
        <Button
          size="xl"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(asText(state)).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy as text"}
        </Button>
        {me.isFacilitator && (
          <Button size="xl" variant="ghost" onClick={() => op("step.set", { step: "discuss" })}>
            <RotateCcw /> Reopen
          </Button>
        )}
      </div>

      {me.isGuest && (
        <div className="mx-auto mt-12 max-w-md rounded-2xl border bg-card p-6 text-center">
          <h3 className="font-semibold">Want to run your own retros?</h3>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">Create a free account. Your name stays the same.</p>
          <Button asChild size="lg">
            <Link href="/signup?next=/home">Create an account</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
