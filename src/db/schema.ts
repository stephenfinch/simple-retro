import { pgTable, text, timestamp, boolean, integer, jsonb, doublePrecision, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Column, RetroSettings, Step } from "@/lib/types";

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

// ─── People ─────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email"),
    name: text("name").notNull().default(""),
    color: text("color").notNull().default("#6366F1"),
    passwordHash: text("password_hash"),
    /** Joined a retro from a link with only a name. */
    isGuest: boolean("is_guest").notNull().default(false),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at"),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ─── Teams ──────────────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: id(),
  name: text("name").notNull(),
  /** Anyone with /join/<inviteCode> can join the team. */
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: createdAt(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "member">().notNull().default("member"),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] }), index("team_members_user_idx").on(t.userId)],
);

// ─── Retros ─────────────────────────────────────────────────────────────────

export const retros = pgTable(
  "retros",
  {
    id: id(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    columns: jsonb("columns").$type<Column[]>().notNull(),
    settings: jsonb("settings").$type<RetroSettings>().notNull(),
    step: text("step").$type<Step>().notNull().default("write"),
    facilitatorId: text("facilitator_id").references(() => users.id, { onDelete: "set null" }),
    /** Card or group being discussed. */
    focusId: text("focus_id"),
    summary: text("summary"),
    /** Bumped on every change; clients long-poll on it. */
    version: integer("version").notNull().default(0),
    createdAt: createdAt(),
    closedAt: ts("closed_at"),
  },
  (t) => [index("retros_team_idx").on(t.teamId, t.createdAt)],
);

export const participants = pgTable(
  "participants",
  {
    retroId: text("retro_id")
      .notNull()
      .references(() => retros.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: ts("joined_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    typingAt: ts("typing_at"),
    /** The step this person marked as done. */
    readyStep: text("ready_step").$type<Step>(),
  },
  (t) => [primaryKey({ columns: [t.retroId, t.userId] })],
);

export const groups = pgTable(
  "groups",
  {
    id: id(),
    retroId: text("retro_id")
      .notNull()
      .references(() => retros.id, { onDelete: "cascade" }),
    columnId: text("column_id").notNull(),
    title: text("title").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("groups_retro_idx").on(t.retroId)],
);

export const cards = pgTable(
  "cards",
  {
    id: id(),
    retroId: text("retro_id")
      .notNull()
      .references(() => retros.id, { onDelete: "cascade" }),
    columnId: text("column_id").notNull(),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    text: text("text").notNull(),
    groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
    position: doublePrecision("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("cards_retro_idx").on(t.retroId)],
);

export const votes = pgTable(
  "votes",
  {
    id: id(),
    retroId: text("retro_id")
      .notNull()
      .references(() => retros.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** A card id or a group id. */
    targetId: text("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("votes_retro_idx").on(t.retroId)],
);

export const actions = pgTable(
  "actions",
  {
    id: id(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    retroId: text("retro_id").references(() => retros.id, { onDelete: "set null" }),
    /** The card or group this action came out of. */
    sourceId: text("source_id"),
    text: text("text").notNull(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    doneAt: ts("done_at"),
    createdAt: createdAt(),
  },
  (t) => [index("actions_team_idx").on(t.teamId), index("actions_retro_idx").on(t.retroId)],
);
