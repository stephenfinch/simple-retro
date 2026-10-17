import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { STEPS, type RetroSettings, type Step } from "@/lib/types";
import { HttpError } from "../http";
import type { RetroCtx } from "./context";
import { aiGroup, aiSuggestActions, aiSummary } from "./ai";

export type Op = { type: string; [key: string]: unknown };

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const need = (v: unknown, what: string, max?: number) => {
  const s = str(v, max);
  if (!s) throw new HttpError(400, `Missing ${what}`);
  return s;
};

function facilitatorOnly(ctx: RetroCtx) {
  if (!ctx.isFacilitator) throw new HttpError(403, "Only the facilitator can do that");
}

function stepIs(ctx: RetroCtx, ...steps: Step[]) {
  if (!steps.includes(ctx.retro.step)) throw new HttpError(409, "That isn't possible in this step");
}

async function getCard(ctx: RetroCtx, id: unknown) {
  const [card] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, String(id)), eq(schema.cards.retroId, ctx.retro.id)))
    .limit(1);
  if (!card) throw new HttpError(404, "That card was removed");
  return card;
}

async function getGroup(ctx: RetroCtx, id: unknown) {
  const [group] = await db
    .select()
    .from(schema.groups)
    .where(and(eq(schema.groups.id, String(id)), eq(schema.groups.retroId, ctx.retro.id)))
    .limit(1);
  return group ?? null;
}

/** A group with fewer than two cards is no longer a group. */
async function tidyGroup(groupId: string | null) {
  if (!groupId) return;
  const members = await db.select({ id: schema.cards.id }).from(schema.cards).where(eq(schema.cards.groupId, groupId));
  if (members.length >= 2) return;
  if (members.length === 1) await db.update(schema.votes).set({ targetId: members[0].id }).where(eq(schema.votes.targetId, groupId));
  await db.update(schema.cards).set({ groupId: null }).where(eq(schema.cards.groupId, groupId));
  await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
}

async function putInGroup(cardIds: string[], groupId: string, columnId: string) {
  if (!cardIds.length) return;
  const before = await db.select({ id: schema.cards.id, groupId: schema.cards.groupId }).from(schema.cards).where(inArray(schema.cards.id, cardIds));
  await db.update(schema.cards).set({ groupId, columnId }).where(inArray(schema.cards.id, cardIds));
  // votes on a card follow it into the group
  await db.update(schema.votes).set({ targetId: groupId }).where(inArray(schema.votes.targetId, cardIds));
  for (const old of new Set(before.map((c) => c.groupId))) if (old !== groupId) await tidyGroup(old);
}

async function votableIds(retroId: string) {
  const [cards, groups] = await Promise.all([
    db.select({ id: schema.cards.id, groupId: schema.cards.groupId }).from(schema.cards).where(eq(schema.cards.retroId, retroId)),
    db.select({ id: schema.groups.id }).from(schema.groups).where(eq(schema.groups.retroId, retroId)),
  ]);
  return new Set([...groups.map((g) => g.id), ...cards.filter((c) => !c.groupId).map((c) => c.id)]);
}

/** The most voted item, for the start of the discussion. */
async function topItem(retroId: string) {
  const ids = await votableIds(retroId);
  if (!ids.size) return null;
  const counts = await db
    .select({ targetId: schema.votes.targetId, n: sql<number>`count(*)::int` })
    .from(schema.votes)
    .where(eq(schema.votes.retroId, retroId))
    .groupBy(schema.votes.targetId);
  const ranked = counts.filter((c) => ids.has(c.targetId)).sort((a, b) => b.n - a.n);
  return ranked[0]?.targetId ?? [...ids][0];
}

async function setRetro(ctx: RetroCtx, values: Partial<typeof schema.retros.$inferInsert>) {
  await db.update(schema.retros).set(values).where(eq(schema.retros.id, ctx.retro.id));
}

async function getAction(ctx: RetroCtx, id: unknown) {
  const [action] = await db
    .select()
    .from(schema.actions)
    .where(and(eq(schema.actions.id, String(id)), eq(schema.actions.teamId, ctx.retro.teamId)))
    .limit(1);
  if (!action) throw new HttpError(404, "That action item was removed");
  return action;
}

async function checkOwner(ctx: RetroCtx, ownerId: unknown) {
  if (ownerId === null || ownerId === undefined || ownerId === "") return null;
  const id = String(ownerId);
  const [p] = await db
    .select({ id: schema.participants.userId })
    .from(schema.participants)
    .where(and(eq(schema.participants.retroId, ctx.retro.id), eq(schema.participants.userId, id)))
    .limit(1);
  const [m] = p
    ? [p]
    : await db
        .select({ id: schema.teamMembers.userId })
        .from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.teamId, ctx.retro.teamId), eq(schema.teamMembers.userId, id)))
        .limit(1);
  if (!m) throw new HttpError(400, "That person isn't part of this retro");
  return id;
}

/** The one place where retro data changes. Returns an optional result for the caller. */
export async function applyOp(ctx: RetroCtx, op: Op): Promise<unknown> {
  const { retro, user } = ctx;
  if (!ctx.participant) throw new HttpError(403, "Join the retro first");
  const closed = retro.step === "done";
  const readOnly = ["step.set", "ai.summary", "typing", "action.update", "facilitator.take"];
  if (closed && !readOnly.includes(op.type)) throw new HttpError(409, "This retro is finished");

  switch (op.type) {
    case "typing": {
      await db
        .update(schema.participants)
        .set({ typingAt: new Date() })
        .where(and(eq(schema.participants.retroId, retro.id), eq(schema.participants.userId, user.id)));
      return null;
    }

    // ── Cards ──
    case "card.add": {
      stepIs(ctx, "write", "group");
      const columnId = need(op.columnId, "column");
      if (!retro.columns.some((c) => c.id === columnId)) throw new HttpError(400, "Unknown column");
      const [card] = await db
        .insert(schema.cards)
        .values({ retroId: retro.id, columnId, authorId: user.id, text: need(op.text, "text"), position: Date.now() })
        .returning({ id: schema.cards.id });
      await db
        .update(schema.participants)
        .set({ typingAt: null })
        .where(and(eq(schema.participants.retroId, retro.id), eq(schema.participants.userId, user.id)));
      return card.id;
    }
    case "card.edit": {
      const card = await getCard(ctx, op.id);
      if (card.authorId !== user.id && !ctx.isFacilitator) throw new HttpError(403, "You can only edit your own cards");
      await db.update(schema.cards).set({ text: need(op.text, "text") }).where(eq(schema.cards.id, card.id));
      return null;
    }
    case "card.delete": {
      const card = await getCard(ctx, op.id);
      if (card.authorId !== user.id && !ctx.isFacilitator) throw new HttpError(403, "You can only delete your own cards");
      await db.delete(schema.votes).where(eq(schema.votes.targetId, card.id));
      await db.delete(schema.cards).where(eq(schema.cards.id, card.id));
      await tidyGroup(card.groupId);
      return null;
    }
    case "card.group": {
      stepIs(ctx, "group");
      const card = await getCard(ctx, op.id);
      const targetId = need(op.targetId, "target");
      if (targetId === card.id) return null;
      const group = await getGroup(ctx, targetId);
      if (group) {
        await putInGroup([card.id], group.id, group.columnId);
        return group.id;
      }
      const target = await getCard(ctx, targetId);
      if (target.groupId) {
        await putInGroup([card.id], target.groupId, target.columnId);
        return target.groupId;
      }
      const [created] = await db.insert(schema.groups).values({ retroId: retro.id, columnId: target.columnId }).returning();
      await putInGroup([target.id, card.id], created.id, target.columnId);
      return created.id;
    }
    case "card.move": {
      stepIs(ctx, "write", "group");
      const card = await getCard(ctx, op.id);
      const columnId = need(op.columnId, "column");
      if (!retro.columns.some((c) => c.id === columnId)) throw new HttpError(400, "Unknown column");
      if (retro.step === "write" && card.authorId !== user.id) throw new HttpError(403, "You can only move your own cards");
      await db.update(schema.cards).set({ columnId, groupId: null, position: Date.now() }).where(eq(schema.cards.id, card.id));
      await tidyGroup(card.groupId);
      return null;
    }
    case "group.rename": {
      const group = await getGroup(ctx, op.id);
      if (!group) throw new HttpError(404, "That group was removed");
      await db.update(schema.groups).set({ title: str(op.title, 120) }).where(eq(schema.groups.id, group.id));
      return null;
    }

    // ── Votes ──
    case "vote.add": {
      stepIs(ctx, "vote");
      const targetId = need(op.targetId, "target");
      if (!(await votableIds(retro.id)).has(targetId)) throw new HttpError(404, "That card was removed");
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.votes)
        .where(and(eq(schema.votes.retroId, retro.id), eq(schema.votes.userId, user.id)));
      if (n >= retro.settings.votes) throw new HttpError(409, "You've used all your votes");
      await db.insert(schema.votes).values({ retroId: retro.id, userId: user.id, targetId });
      return null;
    }
    case "vote.remove": {
      stepIs(ctx, "vote");
      const [vote] = await db
        .select({ id: schema.votes.id })
        .from(schema.votes)
        .where(and(eq(schema.votes.retroId, retro.id), eq(schema.votes.userId, user.id), eq(schema.votes.targetId, need(op.targetId, "target"))))
        .limit(1);
      if (vote) await db.delete(schema.votes).where(eq(schema.votes.id, vote.id));
      return null;
    }

    // ── Flow ──
    case "ready.set": {
      await db
        .update(schema.participants)
        .set({ readyStep: op.ready ? retro.step : null })
        .where(and(eq(schema.participants.retroId, retro.id), eq(schema.participants.userId, user.id)));
      return null;
    }
    case "step.set": {
      facilitatorOnly(ctx);
      const step = op.step as Step;
      if (!STEPS.includes(step)) throw new HttpError(400, "Unknown step");
      const values: Partial<typeof schema.retros.$inferInsert> = { step, closedAt: step === "done" ? (retro.closedAt ?? new Date()) : null };
      if (step === "discuss") values.focusId = (retro.focusId && (await votableIds(retro.id)).has(retro.focusId) ? retro.focusId : null) ?? (await topItem(retro.id));
      await setRetro(ctx, values);
      return null;
    }
    case "focus.set": {
      facilitatorOnly(ctx);
      stepIs(ctx, "discuss");
      const targetId = need(op.targetId, "target");
      if (!(await votableIds(retro.id)).has(targetId)) throw new HttpError(404, "That card was removed");
      await setRetro(ctx, { focusId: targetId });
      return null;
    }
    case "retro.update": {
      facilitatorOnly(ctx);
      const values: Partial<typeof schema.retros.$inferInsert> = {};
      if (op.title !== undefined) values.title = need(op.title, "title", 120);
      if (op.settings && typeof op.settings === "object") {
        const s = op.settings as Partial<RetroSettings>;
        values.settings = {
          votes: s.votes !== undefined ? Math.max(1, Math.min(20, Math.round(Number(s.votes) || 3))) : retro.settings.votes,
          showAuthors: s.showAuthors !== undefined ? !!s.showAuthors : retro.settings.showAuthors,
          hideWhileWriting: s.hideWhileWriting !== undefined ? !!s.hideWhileWriting : retro.settings.hideWhileWriting,
        };
      }
      if (Object.keys(values).length) await setRetro(ctx, values);
      return null;
    }
    case "facilitator.take": {
      if (!ctx.isTeamMember) throw new HttpError(403, "Only team members can facilitate");
      await setRetro(ctx, { facilitatorId: user.id });
      return null;
    }
    case "facilitator.give": {
      facilitatorOnly(ctx);
      const id = need(op.userId, "person");
      const [p] = await db
        .select()
        .from(schema.participants)
        .where(and(eq(schema.participants.retroId, retro.id), eq(schema.participants.userId, id)))
        .limit(1);
      if (!p) throw new HttpError(400, "That person isn't in this retro");
      await setRetro(ctx, { facilitatorId: id });
      return null;
    }

    // ── Action items ──
    case "action.add": {
      const [row] = await db
        .insert(schema.actions)
        .values({
          teamId: retro.teamId,
          retroId: retro.id,
          sourceId: str(op.sourceId, 64) || null,
          text: need(op.text, "action", 500),
          ownerId: await checkOwner(ctx, op.ownerId),
          createdById: user.id,
        })
        .returning({ id: schema.actions.id });
      return row.id;
    }
    case "action.update": {
      const action = await getAction(ctx, op.id);
      const values: Partial<typeof schema.actions.$inferInsert> = {};
      if (op.text !== undefined) values.text = need(op.text, "action", 500);
      if (op.ownerId !== undefined) values.ownerId = await checkOwner(ctx, op.ownerId);
      if (op.done !== undefined) values.doneAt = op.done ? (action.doneAt ?? new Date()) : null;
      if (closed && (values.text !== undefined || values.ownerId !== undefined)) throw new HttpError(409, "This retro is finished");
      await db.update(schema.actions).set(values).where(eq(schema.actions.id, action.id));
      return null;
    }
    case "action.delete": {
      const action = await getAction(ctx, op.id);
      if (action.retroId !== retro.id) throw new HttpError(403, "That action item belongs to another retro");
      await db.delete(schema.actions).where(eq(schema.actions.id, action.id));
      return null;
    }

    // ── AI ──
    case "ai.group": {
      stepIs(ctx, "group");
      return aiGroup(ctx, putInGroup);
    }
    case "ai.actions": {
      stepIs(ctx, "discuss");
      return aiSuggestActions(ctx, need(op.targetId, "target"));
    }
    case "ai.summary": {
      stepIs(ctx, "done");
      const summary = await aiSummary(ctx);
      await setRetro(ctx, { summary });
      return summary;
    }

    default:
      throw new HttpError(400, `Unknown operation: ${op.type}`);
  }
}
