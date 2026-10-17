import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { aiJson, z } from "../ai";
import { HttpError } from "../http";
import type { RetroCtx } from "./context";

type Board = Awaited<ReturnType<typeof loadBoard>>;

async function loadBoard(retroId: string) {
  const [cards, groups, votes, actions] = await Promise.all([
    db.select().from(schema.cards).where(eq(schema.cards.retroId, retroId)).orderBy(asc(schema.cards.position)),
    db.select().from(schema.groups).where(eq(schema.groups.retroId, retroId)).orderBy(asc(schema.groups.createdAt)),
    db
      .select({ targetId: schema.votes.targetId, n: sql<number>`count(*)::int` })
      .from(schema.votes)
      .where(eq(schema.votes.retroId, retroId))
      .groupBy(schema.votes.targetId),
    db
      .select({ text: schema.actions.text, sourceId: schema.actions.sourceId, owner: schema.users.name })
      .from(schema.actions)
      .leftJoin(schema.users, eq(schema.users.id, schema.actions.ownerId))
      .where(eq(schema.actions.retroId, retroId)),
  ]);
  return { cards, groups, votes, actions };
}

function itemText(board: Board, id: string) {
  const group = board.groups.find((g) => g.id === id);
  if (group) {
    const lines = board.cards.filter((c) => c.groupId === id).map((c) => `  - ${c.text}`);
    return `${group.title || "(untitled group)"}\n${lines.join("\n")}`;
  }
  return board.cards.find((c) => c.id === id)?.text ?? "";
}

function boardText(ctx: RetroCtx, board: Board) {
  const votesOf = (id: string) => board.votes.find((v) => v.targetId === id)?.n ?? 0;
  return ctx.retro.columns
    .map((col) => {
      const ids = [
        ...board.groups.filter((g) => g.columnId === col.id).map((g) => g.id),
        ...board.cards.filter((c) => c.columnId === col.id && !c.groupId).map((c) => c.id),
      ].sort((a, b) => votesOf(b) - votesOf(a));
      const items = ids.map((id) => {
        const acts = board.actions.filter((a) => a.sourceId === id).map((a) => `    → action: ${a.text}${a.owner ? ` (${a.owner})` : ""}`);
        return [`- [${votesOf(id)} votes] ${itemText(board, id).replace(/\n/g, "\n  ")}`, ...acts].join("\n");
      });
      return `## ${col.title} (${col.prompt})\n${items.join("\n") || "(nothing)"}`;
    })
    .join("\n\n");
}

/** Groups cards with the same theme within each column. */
export async function aiGroup(ctx: RetroCtx, putInGroup: (cardIds: string[], groupId: string, columnId: string) => Promise<void>) {
  const board = await loadBoard(ctx.retro.id);
  const loose = board.cards.filter((c) => !c.groupId);
  if (loose.length < 2) throw new HttpError(409, "There aren't enough cards to group yet");

  const input = ctx.retro.columns
    .map((col) => {
      const groups = board.groups
        .filter((g) => g.columnId === col.id)
        .map((g) => `  group ${g.id} "${g.title}": ${board.cards.filter((c) => c.groupId === g.id).map((c) => JSON.stringify(c.text)).join(", ")}`);
      const cards = loose.filter((c) => c.columnId === col.id).map((c) => `  card ${c.id}: ${JSON.stringify(c.text)}`);
      return `Column ${col.id} "${col.title}":\n${[...groups, ...cards].join("\n") || "  (empty)"}`;
    })
    .join("\n\n");

  const result = await aiJson(
    z.object({
      groups: z.array(
        z.object({
          existingGroupId: z.string().nullable().describe("Id of an existing group to add cards to, or null for a new group"),
          title: z.string().describe("Short name for the theme, 2 to 5 words"),
          cardIds: z.array(z.string()).describe("Ids of loose cards that belong in this group"),
        }),
      ),
    }),
    "You help a team sort retrospective cards. Group loose cards that share a theme. Only group cards from the same column. A new group needs at least two cards. Leave a card alone when nothing else is similar. Use the card ids exactly as given. Write titles in the same language as the cards.",
    input,
  );

  let made = 0;
  for (const g of result.groups) {
    const ids = g.cardIds.filter((id, i, all) => all.indexOf(id) === i && loose.some((c) => c.id === id && !c.groupId));
    const existing = g.existingGroupId ? board.groups.find((x) => x.id === g.existingGroupId) : null;
    if (existing) {
      const same = ids.filter((id) => loose.find((c) => c.id === id)?.columnId === existing.columnId);
      if (!same.length) continue;
      await putInGroup(same, existing.id, existing.columnId);
      if (!existing.title && g.title) await db.update(schema.groups).set({ title: g.title.slice(0, 120) }).where(eq(schema.groups.id, existing.id));
    } else {
      const columnId = loose.find((c) => c.id === ids[0])?.columnId;
      const same = ids.filter((id) => loose.find((c) => c.id === id)?.columnId === columnId);
      if (!columnId || same.length < 2) continue;
      const [created] = await db.insert(schema.groups).values({ retroId: ctx.retro.id, columnId, title: g.title.slice(0, 120) }).returning();
      await putInGroup(same, created.id, columnId);
    }
    for (const id of ids) {
      const c = loose.find((x) => x.id === id);
      if (c) c.groupId = "used";
    }
    made++;
  }
  return made;
}

export async function aiSuggestActions(ctx: RetroCtx, targetId: string) {
  const board = await loadBoard(ctx.retro.id);
  const topic = itemText(board, targetId);
  if (!topic) throw new HttpError(404, "That card was removed");
  const existing = board.actions.filter((a) => a.sourceId === targetId).map((a) => `- ${a.text}`);
  const result = await aiJson(
    z.object({ actions: z.array(z.string()).describe("Two or three short, concrete next steps") }),
    "You help people turn a retrospective topic into next steps. Suggest two or three small, concrete actions someone could start this week. Each one is a single short sentence that starts with a verb. Don't repeat actions that already exist. Write in the same language as the topic.",
    `Retro: ${ctx.retro.title}\n\nTopic:\n${topic}\n\nExisting actions:\n${existing.join("\n") || "(none)"}`,
  );
  return result.actions.slice(0, 3);
}

export async function aiSummary(ctx: RetroCtx) {
  const board = await loadBoard(ctx.retro.id);
  if (!board.cards.length) throw new HttpError(409, "There's nothing to summarize yet");
  const result = await aiJson(
    z.object({ summary: z.string().describe("The summary, in plain text with short paragraphs") }),
    "You write the summary of a retrospective for the people who took part. Write three short paragraphs in plain, warm language: what went well, what was hard, and what they agreed to do next. Name owners of action items when known. No headings, no bullet lists, no markdown. Write in the same language as the cards.",
    `Retro: ${ctx.retro.title}\n\n${boardText(ctx, board)}`,
  );
  return result.summary.trim();
}
