"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Minus, Plus, Settings2, Sparkles, X } from "lucide-react";
import { startRetroAction } from "@/app/actions/teams";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { COLUMN_STYLES } from "@/lib/colors";
import { TEMPLATES } from "@/lib/templates";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { cn } from "@/lib/utils";

function defaultTitle() {
  return `Retro · ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
}

export function StartRetroButton({ teamId, suggested, size = "xl" }: { teamId: string; suggested?: string; size?: "xl" | "lg" }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState(suggested ?? TEMPLATES[0].key);
  const [columns, setColumns] = useState<{ title: string; prompt: string }[] | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [more, setMore] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const chosen = TEMPLATES.find((t) => t.key === template) ?? TEMPLATES[0];
  const cols = columns ?? chosen.columns.map((c) => ({ title: c.title, prompt: c.prompt }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setTitle(defaultTitle());
      }}
    >
      <DialogTrigger asChild>
        <Button size={size}>
          <Sparkles /> Start a retro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto pb-0 sm:max-w-2xl sm:pb-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              try {
                await startRetroAction(teamId, { title, template, columns: columns ?? undefined, settings });
              } catch (err) {
                if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
                setError((err as Error).message);
              }
            });
          }}
          className="space-y-6"
        >
          <DialogHeader>
            <DialogTitle className="text-xl">Start a retro</DialogTitle>
            <DialogDescription>Pick a format. You can share the link with everyone once it starts.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="retro-title">Name</Label>
            <Input id="retro-title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-11 text-base sm:text-sm" />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Format</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => {
                const active = t.key === template;
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => {
                      setTemplate(t.key);
                      setColumns(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "relative rounded-xl border p-3.5 text-left transition-colors hover:bg-muted/60",
                      active && "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/5",
                    )}
                  >
                    {active && <Check className="absolute top-3 right-3 size-4 text-primary" />}
                    <div className="pr-6 text-sm font-medium">{t.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{t.blurb}</div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {t.columns.map((c) => (
                        <span key={c.title} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          <span className={cn("size-1.5 rounded-full", COLUMN_STYLES[c.color].dot)} />
                          {c.title}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="rounded-xl border">
            <button type="button" onClick={() => setMore((m) => !m)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium" aria-expanded={more}>
              <Settings2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">
                Columns and options
                <span className="block text-xs font-normal text-muted-foreground sm:inline sm:pl-2">
                  {settings.votes} votes each · {settings.showAuthors ? "names shown" : "anonymous"}
                </span>
              </span>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", more && "rotate-180")} />
            </button>
            {more && (
              <div className="space-y-5 border-t px-4 py-4">
                <div className="space-y-2">
                  <Label>Columns</Label>
                  {cols.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2 sm:border-0 sm:p-0">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                        <Input
                          value={c.title}
                          onChange={(e) => setColumns(cols.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                          placeholder="Column name"
                          className="h-10 sm:h-9 sm:w-40 sm:shrink-0"
                          aria-label={`Column ${i + 1} name`}
                        />
                        <Input
                          value={c.prompt}
                          onChange={(e) => setColumns(cols.map((x, j) => (j === i ? { ...x, prompt: e.target.value } : x)))}
                          placeholder="A question to help people write (optional)"
                          className="h-10 sm:h-9"
                          aria-label={`Column ${i + 1} question`}
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="size-10 sm:size-8" aria-label={`Remove column ${i + 1}`} disabled={cols.length <= 1} onClick={() => setColumns(cols.filter((_, j) => j !== i))}>
                        <X />
                      </Button>
                    </div>
                  ))}
                  {cols.length < 6 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setColumns([...cols, { title: "", prompt: "" }])}>
                      <Plus /> Add a column
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Votes per person</div>
                    <div className="text-xs text-muted-foreground">How many topics each person can vote for.</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="icon" aria-label="Fewer votes" onClick={() => setSettings({ ...settings, votes: Math.max(1, settings.votes - 1) })}>
                      <Minus />
                    </Button>
                    <span className="w-8 text-center font-medium tabular-nums">{settings.votes}</span>
                    <Button type="button" variant="outline" size="icon" aria-label="More votes" onClick={() => setSettings({ ...settings, votes: Math.min(20, settings.votes + 1) })}>
                      <Plus />
                    </Button>
                  </div>
                </div>
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">Show who wrote each card</span>
                    <span className="block text-xs text-muted-foreground">Off means cards are anonymous.</span>
                  </span>
                  <Switch checked={settings.showAuthors} onCheckedChange={(v) => setSettings({ ...settings, showAuthors: v })} />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium">Keep cards private while writing</span>
                    <span className="block text-xs text-muted-foreground">Everyone sees all cards once you move on.</span>
                  </span>
                  <Switch checked={settings.hideWhileWriting} onCheckedChange={(v) => setSettings({ ...settings, hideWhileWriting: v })} />
                </label>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 -mx-5 space-y-2 border-t bg-popover px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-4 sm:px-4 sm:pb-4">
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button size="xl" className="w-full" disabled={pending || !title.trim() || !cols.some((c) => c.title.trim())}>
              {pending ? "Starting…" : "Start the retro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
