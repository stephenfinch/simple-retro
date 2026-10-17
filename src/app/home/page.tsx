import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createTeamAction } from "@/app/actions/teams";
import { AppHeader } from "@/components/shell/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/server/auth";
import { teamsFor } from "@/server/teams";

export const metadata = { title: "Your teams" };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser("/home");
  const { all } = await searchParams;
  const teams = await teamsFor(user.id);
  if (teams.length === 1 && !all) redirect(`/t/${teams[0].id}`);
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader user={user} />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        {teams.length > 0 && (
          <section className="mb-10">
            <h1 className="mb-4 text-2xl font-semibold tracking-tight">Your teams</h1>
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {teams.map((t) => (
                <li key={t.id} className="border-b last:border-b-0">
                  <Link href={`/t/${t.id}`} className="flex items-center justify-between px-5 py-4 font-medium hover:bg-muted/60">
                    {t.name}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-2xl border bg-card p-6 shadow-xs">
          <h2 className="text-lg font-semibold">{teams.length ? "Start another team" : `Welcome, ${user.name.split(" ")[0]}!`}</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            {teams.length
              ? "A team is the group of people you retro with."
              : "First, give your team a name. It can be your work team, your family, or just the two of you."}
          </p>
          <form action={createTeamAction} className="flex flex-col gap-3 sm:flex-row">
            <Input name="name" required autoFocus={!teams.length} placeholder="e.g. Product Squad, or Sam & Alex" className="h-11 flex-1 text-base sm:text-sm" />
            <Button size="xl">Create team</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
