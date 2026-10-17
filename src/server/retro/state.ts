import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CardDTO, GroupDTO, RetroStateDTO } from "@/lib/types";
import { aiEnabled } from "../ai";
import { actionDTOs, openActionsBefore } from "../teams";
import type { RetroCtx } from "./context";

const ONLINE_MS = 45_000;

/** What one person sees of a retro. Hidden cards and other people's votes never leave the server. */
export async function buildRetroState(ctx: RetroCtx): Promise<RetroStateDTO> {
  const { retro, user } = ctx;
  const [cards, groups, votes, people, actions, earlierActions] = await Promise.all([
    db.select().from(schema.cards).where(eq(schema.cards.retroId, retro.id)).orderBy(asc(schema.cards.position)),
    db.select().from(schema.groups).where(eq(schema.groups.retroId, retro.id)).orderBy(asc(schema.groups.createdAt)),
    db.select({ userId: schema.votes.userId, targetId: schema.votes.targetId }).from(schema.votes).where(eq(schema.votes.retroId, retro.id)),
    db
      .select({ p: schema.participants, id: schema.users.id, name: schema.users.name, color: schema.users.color })
      .from(schema.participants)
      .innerJoin(schema.users, eq(schema.users.id, schema.participants.userId))
      .where(eq(schema.participants.retroId, retro.id))
      .orderBy(asc(schema.participants.joinedAt)),
    db.select().from(schema.actions).where(eq(schema.actions.retroId, retro.id)).orderBy(asc(schema.actions.createdAt)),
    openActionsBefore(retro.teamId, retro.id, retro.createdAt),
  ]);

  const now = Date.now();
  const hide = retro.step === "write" && retro.settings.hideWhileWriting;
  const showTotals = retro.step === "discuss" || retro.step === "done";
  const total = (id: string) => (showTotals ? votes.filter((v) => v.targetId === id).length : null);
  const mine = (id: string) => votes.filter((v) => v.targetId === id && v.userId === user.id).length;
  const personOf = (id: string | null) => {
    const p = people.find((x) => x.id === id);
    return p ? { id: p.id, name: p.name, color: p.color } : null;
  };

  const cardDTOs: CardDTO[] = cards.map((c) => {
    const isMine = c.authorId === user.id;
    const hidden = hide && !isMine;
    return {
      id: c.id,
      columnId: c.columnId,
      groupId: c.groupId,
      text: hidden ? "" : c.text,
      hidden,
      mine: isMine,
      author: retro.settings.showAuthors && !hidden ? personOf(c.authorId) : null,
      votes: total(c.id),
      myVotes: mine(c.id),
    };
  });
  const groupDTOs: GroupDTO[] = groups.map((g) => ({ id: g.id, columnId: g.columnId, title: g.title, votes: total(g.id), myVotes: mine(g.id) }));
  const myVoteCount = votes.filter((v) => v.userId === user.id).length;

  return {
    version: retro.version,
    serverNow: new Date().toISOString(),
    ai: aiEnabled(),
    me: {
      id: user.id,
      name: user.name,
      isGuest: user.isGuest,
      isFacilitator: ctx.isFacilitator,
      canFacilitate: ctx.isTeamMember,
      isTeamMember: ctx.isTeamMember,
      votesLeft: Math.max(0, retro.settings.votes - myVoteCount),
      ready: ctx.participant?.readyStep === retro.step,
    },
    retro: {
      id: retro.id,
      title: retro.title,
      teamId: retro.teamId,
      teamName: ctx.teamName,
      step: retro.step,
      columns: retro.columns,
      settings: retro.settings,
      facilitatorId: retro.facilitatorId ?? "",
      focusId: retro.focusId,
      summary: retro.summary,
      createdAt: retro.createdAt.toISOString(),
      closedAt: retro.closedAt?.toISOString() ?? null,
    },
    people: people.map((x) => ({
      id: x.id,
      name: x.name,
      color: x.color,
      online: x.id === user.id || now - x.p.lastSeenAt.getTime() < ONLINE_MS,
      typingAt: x.p.typingAt?.toISOString() ?? null,
      ready: x.p.readyStep === retro.step,
    })),
    cards: cardDTOs,
    groups: groupDTOs,
    actions: await actionDTOs(actions),
    earlierActions,
  };
}
