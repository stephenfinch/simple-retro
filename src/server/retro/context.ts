import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CurrentUser } from "../auth";
import { HttpError } from "../http";
import { membership } from "../teams";

export type Retro = typeof schema.retros.$inferSelect;
export type RetroCtx = Awaited<ReturnType<typeof loadRetro>>;

/**
 * Anyone with a retro's link can take part. Opening it adds the viewer as a participant.
 * Team members can also see it from the team page and take over facilitation.
 */
export async function loadRetro(retroId: string, user: CurrentUser, opts: { join?: boolean } = {}) {
  const [row] = await db
    .select({ retro: schema.retros, teamName: schema.teams.name })
    .from(schema.retros)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.retros.teamId))
    .where(eq(schema.retros.id, retroId))
    .limit(1);
  if (!row) throw new HttpError(404, "This retro doesn't exist anymore");
  const { retro, teamName } = row;
  const member = user.isGuest ? null : await membership(retro.teamId, user.id);
  let [participant] = await db
    .select()
    .from(schema.participants)
    .where(and(eq(schema.participants.retroId, retroId), eq(schema.participants.userId, user.id)))
    .limit(1);
  if (!participant && opts.join) {
    await db.insert(schema.participants).values({ retroId, userId: user.id }).onConflictDoNothing();
    [participant] = await db
      .select()
      .from(schema.participants)
      .where(and(eq(schema.participants.retroId, retroId), eq(schema.participants.userId, user.id)))
      .limit(1);
  }
  return {
    retro,
    teamName,
    user,
    participant: participant ?? null,
    isTeamMember: !!member,
    isFacilitator: retro.facilitatorId === user.id,
  };
}
