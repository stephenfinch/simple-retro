"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/server/auth";
import { createTeam, loadTeam, membership, newInviteCode } from "@/server/teams";
import { DEFAULT_SETTINGS, type Column, type RetroSettings } from "@/lib/types";
import { templateByKey } from "@/lib/templates";

export async function createTeamAction(form: FormData) {
  const user = await requireUser();
  const team = await createTeam(String(form.get("name") ?? ""), user.id);
  redirect(`/t/${team.id}`);
}

export async function renameTeamAction(teamId: string, name: string) {
  const user = await requireUser();
  await loadTeam(teamId, user);
  const clean = name.trim().slice(0, 80);
  if (!clean) return;
  await db.update(schema.teams).set({ name: clean }).where(eq(schema.teams.id, teamId));
  revalidatePath(`/t/${teamId}`);
}

export async function resetInviteAction(teamId: string) {
  const user = await requireUser();
  const { role } = await loadTeam(teamId, user);
  if (role !== "owner") throw new Error("Only team owners can do that");
  await db.update(schema.teams).set({ inviteCode: newInviteCode() }).where(eq(schema.teams.id, teamId));
  revalidatePath(`/t/${teamId}`);
}

export async function removeMemberAction(teamId: string, userId: string) {
  const user = await requireUser();
  const { role } = await loadTeam(teamId, user);
  if (role !== "owner" && userId !== user.id) throw new Error("Only team owners can do that");
  await db.delete(schema.teamMembers).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)));
  const left = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.teamId, teamId));
  if (left.length && !left.some((m) => m.role === "owner")) {
    await db.update(schema.teamMembers).set({ role: "owner" }).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, left[0].userId)));
  }
  if (!left.length) await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
  if (userId === user.id) redirect("/home");
  revalidatePath(`/t/${teamId}`);
}

export async function deleteTeamAction(teamId: string) {
  const user = await requireUser();
  const { role } = await loadTeam(teamId, user);
  if (role !== "owner") throw new Error("Only team owners can do that");
  await db.delete(schema.teams).where(eq(schema.teams.id, teamId));
  redirect("/home");
}

export async function joinTeamAction(code: string) {
  const user = await requireUser(`/join/${code}`);
  const [team] = await db.select().from(schema.teams).where(eq(schema.teams.inviteCode, code)).limit(1);
  if (!team) redirect("/home");
  if (!(await membership(team.id, user.id))) await db.insert(schema.teamMembers).values({ teamId: team.id, userId: user.id }).onConflictDoNothing();
  redirect(`/t/${team.id}`);
}

export async function startRetroAction(
  teamId: string,
  input: { title: string; template: string; columns?: { title: string; prompt?: string }[]; settings?: Partial<RetroSettings> },
) {
  const user = await requireUser();
  await loadTeam(teamId, user);
  const template = templateByKey(input.template);
  const base = input.columns?.length
    ? input.columns
        .filter((c) => c.title.trim())
        .slice(0, 6)
        .map((c, i) => ({ title: c.title.trim().slice(0, 60), prompt: (c.prompt ?? "").trim().slice(0, 140), color: template.columns[i % template.columns.length]?.color ?? "blue" }))
    : template.columns;
  if (!base.length) throw new Error("Add at least one column");
  const columns: Column[] = base.map((c, i) => ({ ...c, id: `c${i + 1}` }));
  const s = { ...DEFAULT_SETTINGS, ...input.settings };
  const settings: RetroSettings = { votes: Math.max(1, Math.min(20, Math.round(Number(s.votes) || 3))), showAuthors: !!s.showAuthors, hideWhileWriting: !!s.hideWhileWriting };
  const [retro] = await db
    .insert(schema.retros)
    .values({ teamId, title: input.title.trim().slice(0, 120) || "Retro", columns, settings, facilitatorId: user.id })
    .returning({ id: schema.retros.id });
  await db.insert(schema.participants).values({ retroId: retro.id, userId: user.id });
  redirect(`/r/${retro.id}`);
}

export async function deleteRetroAction(retroId: string) {
  const user = await requireUser();
  const [retro] = await db.select().from(schema.retros).where(eq(schema.retros.id, retroId)).limit(1);
  if (!retro) return;
  await loadTeam(retro.teamId, user);
  await db.delete(schema.retros).where(eq(schema.retros.id, retroId));
  revalidatePath(`/t/${retro.teamId}`);
}

export async function toggleActionAction(actionId: string, done: boolean) {
  const user = await requireUser();
  const [action] = await db.select().from(schema.actions).where(eq(schema.actions.id, actionId)).limit(1);
  if (!action) return;
  await loadTeam(action.teamId, user);
  await db.update(schema.actions).set({ doneAt: done ? new Date() : null }).where(eq(schema.actions.id, actionId));
  revalidatePath(`/t/${action.teamId}`);
}

export async function deleteActionAction(actionId: string) {
  const user = await requireUser();
  const [action] = await db.select().from(schema.actions).where(eq(schema.actions.id, actionId)).limit(1);
  if (!action) return;
  await loadTeam(action.teamId, user);
  await db.delete(schema.actions).where(eq(schema.actions.id, actionId));
  revalidatePath(`/t/${action.teamId}`);
}

export async function renameSelfAction(name: string) {
  const user = await requireUser();
  const clean = name.trim().slice(0, 60);
  if (clean) await db.update(schema.users).set({ name: clean }).where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
}
