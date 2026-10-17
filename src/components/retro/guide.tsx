"use client";

import { useState } from "react";
import { ArrowRight, Check, Crown, Flag, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RetroStateDTO, Step } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { rankedItems } from "./items";
import { useNow, useRetro } from "./use-retro";

const FLOW: { step: Step; label: string }[] = [
  { step: "write", label: "Write" },
  { step: "group", label: "Group" },
  { step: "vote", label: "Vote" },
  { step: "discuss", label: "Discuss" },
];

const NEXT_LABEL: Partial<Record<Step, string>> = {
  write: "Next: group cards",
  group: "Next: vote",
  vote: "Next: discuss",
  discuss: "Finish the retro",
};

function guide(state: RetroStateDTO): { title: string; text: string; touchText?: string } {
  const s = state.retro.settings;
  switch (state.retro.step) {
    case "write":
      return {
        title: "Write your thoughts",
        text: s.hideWhileWriting ? "Add one card for each thought. Nobody else can read your cards until the next step." : "Add one card for each thought.",
      };
    case "group":
      return {
        title: "Put similar cards together",
        text: "Drag a card onto another card to make a group, then give the group a short name. Skip this if nothing goes together.",
        touchText: "Press and hold a card, then drag it onto another one. Or tap ⋯ on a card. Skip this if nothing goes together.",
      };
    case "vote":
      return {
        title: "Vote on what to talk about",
        text: `You have ${s.votes} ${s.votes === 1 ? "vote" : "votes"}. Put them on the topics that matter most to you. A topic can get more than one.`,
      };
    case "discuss":
      return { title: "Talk it through", text: "Go through the topics with the most votes first. Before moving on, agree on what to do about it." };
    default:
      return { title: "", text: "" };
  }
}

export function Guide() {
  const { state, op } = useRetro();
  const { retro, me } = state;
  const idx = FLOW.findIndex((f) => f.step === retro.step);
  const { title, text, touchText } = guide(state);
  const facilitator = state.people.find((p) => p.id === retro.facilitatorId);
  const others = state.people.filter((p) => p.online && p.id !== retro.facilitatorId);
  const readyCount = others.filter((p) => p.ready).length;
  const askReady = retro.step !== "discuss";

  const goTo = async (step: Step) => {
    if (step === "done" && !confirm("Finish the retro? Everyone will see the summary.")) return;
    await op("step.set", { step });
  };

  const controls = { goTo, idx, others, readyCount, askReady, facilitator };

  return (
    <div className="border-b bg-card/60">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2.5 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:gap-8">
        <ol className="flex items-center gap-1 sm:gap-1.5" aria-label="Steps">
          {FLOW.map((f, i) => {
            const done = i < idx;
            const current = i === idx;
            const clickable = me.isFacilitator && !current;
            const Comp = clickable ? "button" : "span";
            return (
              <li key={f.step} className="flex items-center gap-1 sm:gap-1.5">
                {i > 0 && <span className={cn("h-px w-3 sm:w-5", done || current ? "bg-primary/50" : "bg-border")} />}
                <Comp
                  {...(clickable ? { onClick: () => goTo(f.step), title: done ? `Go back to ${f.label}` : `Skip to ${f.label}`, "aria-label": done ? `Go back to ${f.label}` : `Skip to ${f.label}` } : {})}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-sm transition-colors",
                    current && "bg-primary text-primary-foreground",
                    done && "text-primary",
                    !current && !done && "text-muted-foreground",
                    clickable && "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      current ? "bg-primary-foreground/20" : done ? "bg-primary/10" : "bg-muted",
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn(!current && "hidden sm:inline")}>{f.label}</span>
                </Comp>
              </li>
            );
          })}
          <li className="ml-auto text-xs text-muted-foreground sm:hidden" aria-hidden>
            Step {idx + 1} of {FLOW.length}
          </li>
        </ol>

        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-tight font-semibold sm:text-lg">{title}</h2>
          {touchText ? (
            <>
              <p className="mt-0.5 text-sm text-muted-foreground [@media(hover:none)]:hidden">{text}</p>
              <p className="mt-0.5 hidden text-sm text-muted-foreground [@media(hover:none)]:block">{touchText}</p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
          )}
          <Typing />
        </div>

        <div className="hidden flex-wrap items-center gap-2 lg:flex lg:justify-end">
          <Controls {...controls} />
        </div>
      </div>
      <MobileBar {...controls} />
    </div>
  );
}

type ControlProps = {
  goTo: (step: Step) => Promise<void>;
  idx: number;
  others: RetroStateDTO["people"];
  readyCount: number;
  askReady: boolean;
  facilitator: RetroStateDTO["people"][number] | undefined;
};

/** The step's buttons, inline on large screens. */
function Controls({ goTo, idx, others, readyCount, askReady, facilitator }: ControlProps) {
  const { state, op } = useRetro();
  const { retro, me } = state;
  return (
    <>
      {retro.step === "vote" && <VotesLeft />}
      {me.isFacilitator ? (
        <>
          {askReady && others.length > 0 && (
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {readyCount} of {others.length} done
            </span>
          )}
          {retro.step === "group" && state.ai && <AiGroupButton />}
          <Button size="xl" onClick={() => goTo(FLOW[idx + 1]?.step ?? "done")} className={cn(askReady && others.length > 0 && readyCount === others.length && "animate-ready")}>
            {NEXT_LABEL[retro.step]} <ArrowRight />
          </Button>
        </>
      ) : (
        <>
          {askReady && <DoneButton ready={me.ready} onToggle={() => op("ready.set", { ready: !me.ready })} />}
          {facilitator && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Crown className="size-3.5 fill-amber-400 text-amber-500" />
              {facilitator.name.split(" ")[0]} moves everyone on
            </span>
          )}
        </>
      )}
    </>
  );
}

function DoneButton({ ready, onToggle, className }: { ready: boolean; onToggle: () => void; className?: string }) {
  return (
    <Button size="xl" variant={ready ? "secondary" : "outline"} onClick={onToggle} aria-pressed={ready} className={className}>
      {ready && <Check className="text-emerald-600" />} I&apos;m done
    </Button>
  );
}

/** On phones the step's buttons sit in a bar at the bottom, within reach of a thumb. */
function MobileBar({ goTo, idx, others, readyCount, askReady, facilitator }: ControlProps) {
  const { state, op } = useRetro();
  const { retro, me } = state;
  const items = retro.step === "discuss" ? rankedItems(state) : [];
  const topic = Math.max(0, items.findIndex((i) => i.id === retro.focusId));
  const lastTopic = topic >= items.length - 1;
  const here = state.people.filter((p) => p.online);

  let left: React.ReactNode;
  if (retro.step === "vote") left = <VotesLeft compact />;
  else if (retro.step === "discuss" && items.length) left = <span className="text-sm text-muted-foreground">Topic {topic + 1} of {items.length}</span>;
  else left = <HereNow people={here} showReady={askReady} readyCount={readyCount} total={others.length} facilitatorView={me.isFacilitator} />;

  let right: React.ReactNode = null;
  if (me.isFacilitator) {
    if (retro.step === "discuss" && items.length && !lastTopic) {
      right = (
        <>
          <Button variant="ghost" size="icon-lg" className="size-11" aria-label="Finish the retro" title="Finish the retro" onClick={() => goTo("done")}>
            <Flag />
          </Button>
          <Button size="xl" onClick={() => op("focus.set", { targetId: items[topic + 1].id })}>
            Next topic <ArrowRight />
          </Button>
        </>
      );
    } else {
      right = (
        <>
          {retro.step === "group" && state.ai && <AiGroupButton iconOnly />}
          <Button size="xl" onClick={() => goTo(FLOW[idx + 1]?.step ?? "done")} className={cn(askReady && others.length > 0 && readyCount === others.length && "animate-ready")}>
            {retro.step === "discuss" ? "Finish the retro" : NEXT_LABEL[retro.step]} <ArrowRight />
          </Button>
        </>
      );
    }
  } else if (askReady) {
    right = <DoneButton ready={me.ready} onToggle={() => op("ready.set", { ready: !me.ready })} />;
  } else if (facilitator) {
    right = (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Crown className="size-3.5 fill-amber-400 text-amber-500" />
        {facilitator.name.split(" ")[0]} leads
      </span>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/85 lg:hidden">
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="min-w-0 flex-1">{left}</div>
        {right}
      </div>
    </div>
  );
}

function HereNow({ people, showReady, readyCount, total, facilitatorView }: { people: RetroStateDTO["people"]; showReady: boolean; readyCount: number; total: number; facilitatorView: boolean }) {
  const shown = people.slice(0, 4);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 -space-x-1.5">
        {shown.map((p) => (
          <span key={p.id} className="relative">
            <UserAvatar name={p.name} color={p.color} size={26} ring />
            {showReady && p.ready && (
              <span className="absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <Check className="size-2 text-white" strokeWidth={3} />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {facilitatorView && showReady && total > 0 ? `${readyCount} of ${total} done` : `${people.length} here`}
      </span>
    </div>
  );
}

function VotesLeft({ compact }: { compact?: boolean }) {
  const { state } = useRetro();
  const total = state.retro.settings.votes;
  const left = state.me.votesLeft;
  return (
    <div className={cn("flex items-center gap-2 rounded-full border bg-background px-3 py-1.5", compact ? "w-fit" : "mr-2")} aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: Math.min(total, 10) }, (_, i) => (
          <span key={i} className={cn("size-2.5 rounded-full transition-colors", i < total - left ? "bg-primary" : "bg-primary/15")} />
        ))}
      </div>
      <span className="text-sm font-medium">{left === 0 ? "All votes used" : `${left} ${left === 1 ? "vote" : "votes"} left`}</span>
    </div>
  );
}

function AiGroupButton({ iconOnly }: { iconOnly?: boolean }) {
  const { op } = useRetro();
  const [busy, setBusy] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size={iconOnly ? "icon-lg" : "xl"}
          variant="outline"
          className={cn(iconOnly && "size-11")}
          aria-label="Group for me"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await op("ai.group");
            setBusy(false);
            if (r.ok) toast.success(r.result ? `Made ${r.result} ${r.result === 1 ? "group" : "groups"}. Drag cards to adjust.` : "Nothing obvious to group.");
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {!iconOnly && (busy ? "Grouping…" : "Group for me")}
        </Button>
      </TooltipTrigger>
      <TooltipContent>AI puts similar cards together. You can still change it.</TooltipContent>
    </Tooltip>
  );
}

function Typing() {
  const { state, clockOffset } = useRetro();
  const now = useNow(1000) + clockOffset;
  if (state.retro.step !== "write") return null;
  const names = state.people.filter((p) => p.id !== state.me.id && p.typingAt && now - new Date(p.typingAt).getTime() < 6000).map((p) => p.name.split(" ")[0]);
  if (!names.length) return null;
  const who = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.length} people`;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="typing-dots flex gap-0.5">
        <span className="size-1 rounded-full bg-current" />
        <span className="size-1 rounded-full bg-current" />
        <span className="size-1 rounded-full bg-current" />
      </span>
      {who} {names.length === 1 ? "is" : "are"} writing…
    </p>
  );
}
