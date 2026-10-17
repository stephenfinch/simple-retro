import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { joinTeamAction } from "@/app/actions/teams";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { membership, teamMembersOf } from "@/server/teams";
import { AvatarStack } from "@/components/user-avatar";
import { redirect } from "next/navigation";

export const metadata = { title: "Join a team" };

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const [team] = await db.select().from(schema.teams).where(eq(schema.teams.inviteCode, code)).limit(1);
  const user = await getCurrentUser();
  if (team && user && !user.isGuest && (await membership(team.id, user.id))) redirect(`/t/${team.id}`);
  const members = team ? await teamMembersOf(team.id) : [];
  const next = `/join/${code}`;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
        {!team ? (
          <>
            <h1 className="text-xl font-semibold">This invite link doesn&apos;t work</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ask for a new link from someone on the team.</p>
          </>
        ) : (
          <>
            <div className="mb-4 flex justify-center">
              <AvatarStack people={members} size={36} max={6} />
            </div>
            <p className="text-sm text-muted-foreground">You&apos;re invited to join</p>
            <h1 className="mt-1 mb-6 text-2xl font-semibold">{team.name}</h1>
            {user && !user.isGuest ? (
              <form action={joinTeamAction.bind(null, code)}>
                <Button size="xl" className="w-full">
                  Join as {user.name}
                </Button>
              </form>
            ) : (
              <div className="space-y-3">
                <Button asChild size="xl" className="w-full">
                  <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account to join</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="w-full">
                  <Link href={`/login?next=${encodeURIComponent(next)}`}>I already have an account</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
