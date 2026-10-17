import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { GuestForm } from "@/components/auth-forms";
import { Logo } from "@/components/brand";
import { RetroRoom } from "@/components/retro/room";
import { appUrl, getCurrentUser } from "@/server/auth";
import { HttpError } from "@/server/http";
import { loadRetro } from "@/server/retro/context";
import { buildRetroState } from "@/server/retro/state";

export const dynamic = "force-dynamic";

async function retroHeader(id: string) {
  const [row] = await db
    .select({ title: schema.retros.title, team: schema.teams.name, step: schema.retros.step })
    .from(schema.retros)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.retros.teamId))
    .where(eq(schema.retros.id, id))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  const row = await retroHeader(id);
  return { title: row?.title ?? "Retro" };
}

export default async function RetroPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    const row = await retroHeader(id);
    if (!row) notFound();
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
        <Logo className="mb-8" />
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm text-muted-foreground">{row.team} invited you to</p>
          <h1 className="mt-1 mb-6 text-2xl font-semibold tracking-tight">{row.title}</h1>
          <GuestForm retroId={id} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(`/r/${id}`)}`} className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }
  let ctx;
  try {
    ctx = await loadRetro(id, user, { join: true });
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const state = await buildRetroState(ctx);
  return <RetroRoom initial={state} link={appUrl(`/r/${id}`)} user={{ name: user.name, email: user.email, color: user.color, isGuest: user.isGuest }} />;
}
