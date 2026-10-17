import Link from "next/link";
import { ArrowRight, CircleDot } from "lucide-react";
import { AppHeader } from "@/components/shell/app-header";
import { InviteButton } from "@/components/team/invite";
import { RetroRowMenu } from "@/components/team/retro-row-menu";
import { StartRetroButton } from "@/components/team/start-retro";
import { TeamActions } from "@/components/team/team-actions";
import { TeamSettings } from "@/components/team/team-settings";
import { AvatarStack } from "@/components/user-avatar";
import { appUrl, requireUser } from "@/server/auth";
import { loadTeam, teamActions, teamMembersOf, teamRetros } from "@/server/teams";

const STEP_LABEL = { write: "Writing", group: "Grouping", vote: "Voting", discuss: "Discussing", done: "Finished" } as const;

export async function generateMetadata({ params }: PageProps<"/t/[team]">) {
  const { team } = await params;
  const user = await requireUser(`/t/${team}`);
  const { team: t } = await loadTeam(team, user);
  return { title: t.name };
}

const SHOWN = 5;

function PastRetro({ retro: r }: { retro: Awaited<ReturnType<typeof teamRetros>>[number] }) {
  return (
    <li className="flex items-center gap-1 pr-2">
      <Link href={`/r/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 hover:bg-muted/40">
        <CircleDot className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{r.title}</div>
          <div className="text-xs text-muted-foreground">
            {when(r.closedAt!)} · {r.cards} cards · {r.actions} action {r.actions === 1 ? "item" : "items"}
          </div>
        </div>
      </Link>
      <RetroRowMenu retroId={r.id} title={r.title} />
    </li>
  );
}

function when(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export default async function TeamPage({ params }: PageProps<"/t/[team]">) {
  const { team: teamId } = await params;
  const user = await requireUser(`/t/${teamId}`);
  const { team, role } = await loadTeam(teamId, user);
  const [members, retros, actions] = await Promise.all([teamMembersOf(teamId), teamRetros(teamId), teamActions(teamId)]);
  const open = retros.filter((r) => !r.closedAt);
  const past = retros.filter((r) => r.closedAt);
  const openActions = actions.filter((a) => !a.done).length;
  const couple = members.length <= 2;

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight break-words sm:truncate sm:text-3xl">{team.name}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <AvatarStack people={members} size={26} max={8} />
              <span>
                {members.length} {members.length === 1 ? "person" : "people"}
              </span>
            </div>
          </div>
          <InviteButton teamId={teamId} link={appUrl(`/join/${team.inviteCode}`)} isOwner={role === "owner"} />
          <TeamSettings teamId={teamId} name={team.name} members={members} meId={user.id} isOwner={role === "owner"} />
        </div>

        {open.length > 0 && (
          <section className="mt-8 space-y-3">
            {open.map((r) => (
              <Link
                key={r.id}
                href={`/r/${r.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
              >
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
                  <span className="relative inline-flex size-3 rounded-full bg-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{r.title}</div>
                  <div className="text-sm text-muted-foreground">
                    In progress · {STEP_LABEL[r.step]} · {r.people} joined
                  </div>
                </div>
                <span className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex">
                  Rejoin <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* Phones: start, then action items, then past retros. Large screens: two columns. */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <section className="rounded-2xl border bg-card p-6 shadow-xs lg:col-start-1">
            <h2 className="text-lg font-semibold">{retros.length ? "Time for another look back?" : "Run your first retro"}</h2>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              {retros.length
                ? "Start a retro, share the link, and walk through it together. It takes 30 to 60 minutes."
                : "Pick a format, share the link with everyone, and the app walks you through each step."}
            </p>
            <StartRetroButton teamId={teamId} suggested={couple ? "couple" : undefined} />
          </section>

          <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Action items</h2>
              {openActions > 0 && <span className="text-xs text-muted-foreground">{openActions} to do</span>}
            </div>
            <TeamActions actions={actions} />
          </section>

          <section className="lg:col-start-1">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Past retros</h2>
            {past.length ? (
              <>
                <ul className="divide-y rounded-xl border bg-card">
                  {past.slice(0, SHOWN).map((r) => (
                    <PastRetro key={r.id} retro={r} />
                  ))}
                </ul>
                {past.length > SHOWN && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none rounded-lg px-1 py-2 text-sm font-medium text-primary hover:underline group-open:hidden">Show {past.length - SHOWN} older retros</summary>
                    <ul className="divide-y rounded-xl border bg-card">
                      {past.slice(SHOWN).map((r) => (
                        <PastRetro key={r.id} retro={r} />
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Finished retros will be listed here.</p>
            )}
          </section>
        </div>
        {open.length === 0 && retros.length === 0 && members.length === 1 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Tip: you don&apos;t have to invite people first. Start a retro and share its link. People can join with just their name.
          </p>
        )}
      </main>
    </div>
  );
}
