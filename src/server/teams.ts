import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { customAlphabet } from "nanoid";
import { db, schema } from "@/db";
import type { CurrentUser } from "./auth";
import type { ActionDTO } from "@/lib/types";

export const newInviteCode = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 10);

export type Team = typeof schema.teams.$inferSelect;

export async function createTeam(name: string, ownerId: string) {
  const [team] = await db
    .insert(schema.teams)
    .values({ name: name.trim().slice(0, 80) || "My team", inviteCode: newInviteCode() })
    .returning();
  await db.insert(schema.teamMembers).values({ teamId: team.id, userId: ownerId, role: "owner" });
  return team;
}

export async function membership(teamId: string, userId: string) {
  const [row] = await db
    .select()
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Team page access: the team and the viewer's role, or a 404. */
export const loadTeam = cache(async (teamId: string, user: CurrentUser) => {
  const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
  if (!team) notFound();
  const member = await membership(teamId, user.id);
  if (!member) notFound();
  return { team, role: member.role };
});

export async function teamsFor(userId: string) {
  return db
    .select({ id: schema.teams.id, name: schema.teams.name, role: schema.teamMembers.role })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
    .where(eq(schema.teamMembers.userId, userId))
    .orderBy(asc(schema.teams.name));
}

export async function teamMembersOf(teamId: string) {
  return db
    .select({ id: schema.users.id, name: schema.users.name, color: schema.users.color, email: schema.users.email, role: schema.teamMembers.role })
    .from(schema.teamMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId))
    .where(eq(schema.teamMembers.teamId, teamId))
    .orderBy(asc(schema.teamMembers.joinedAt));
}

type ActionRow = typeof schema.actions.$inferSelect;

export async function actionDTOs(rows: ActionRow[]): Promise<ActionDTO[]> {
  const ownerIds = [...new Set(rows.map((r) => r.ownerId).filter((x): x is string => !!x))];
  const retroIds = [...new Set(rows.map((r) => r.retroId).filter((x): x is string => !!x))];
  const owners = ownerIds.length
    ? await db.select({ id: schema.users.id, name: schema.users.name, color: schema.users.color }).from(schema.users).where(inArray(schema.users.id, ownerIds))
    : [];
  const retros = retroIds.length ? await db.select({ id: schema.retros.id, title: schema.retros.title }).from(schema.retros).where(inArray(schema.retros.id, retroIds)) : [];
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    owner: owners.find((o) => o.id === r.ownerId) ?? null,
    done: !!r.doneAt,
    sourceId: r.sourceId,
    retroId: r.retroId,
    retroTitle: retros.find((x) => x.id === r.retroId)?.title ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Open actions, plus ones finished in the last two weeks so people can see progress. */
export async function teamActions(teamId: string) {
  const rows = await db
    .select()
    .from(schema.actions)
    .where(and(eq(schema.actions.teamId, teamId), sql`(${schema.actions.doneAt} is null or ${schema.actions.doneAt} > now() - interval '14 days')`))
    .orderBy(sql`${schema.actions.doneAt} is not null`, desc(schema.actions.createdAt));
  return actionDTOs(rows);
}

/** Action items from other retros that were still open when this retro started. */
export async function openActionsBefore(teamId: string, retroId: string, since: Date) {
  const rows = await db
    .select()
    .from(schema.actions)
    .where(
      and(
        eq(schema.actions.teamId, teamId),
        sql`${schema.actions.retroId} is distinct from ${retroId}`,
        sql`${schema.actions.createdAt} < ${since}`,
        or(isNull(schema.actions.doneAt), gte(schema.actions.doneAt, since)),
      ),
    )
    .orderBy(desc(schema.actions.createdAt))
    .limit(30);
  return actionDTOs(rows);
}

export async function teamRetros(teamId: string) {
  const rows = await db
    .select({
      id: schema.retros.id,
      title: schema.retros.title,
      step: schema.retros.step,
      createdAt: schema.retros.createdAt,
      closedAt: schema.retros.closedAt,
      cards: sql<number>`(select count(*)::int from cards c where c.retro_id = retros.id)`,
      actions: sql<number>`(select count(*)::int from actions a where a.retro_id = retros.id)`,
      people: sql<number>`(select count(*)::int from participants p where p.retro_id = retros.id)`,
    })
    .from(schema.retros)
    .where(eq(schema.retros.teamId, teamId))
    .orderBy(desc(schema.retros.createdAt));
  return rows;
}
