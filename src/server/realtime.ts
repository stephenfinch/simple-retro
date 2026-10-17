import "server-only";
import { EventEmitter } from "node:events";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Realtime model: every retro row carries a monotonically increasing `version`.
 * Any change bumps it. Clients long-poll `/api/retros/:id/state?v=<version>`
 * and get a fresh snapshot as soon as the version moves. Within one server process
 * waiters are woken instantly via an EventEmitter; across processes (serverless)
 * the long-poll loop re-checks the database every second.
 */
const g = globalThis as unknown as { __srBus?: EventEmitter };
export const bus: EventEmitter = g.__srBus ?? (g.__srBus = new EventEmitter());
bus.setMaxListeners(0);

export async function bumpVersion(retroId: string) {
  const rows = await db
    .update(schema.retros)
    .set({ version: sql`${schema.retros.version} + 1` })
    .where(eq(schema.retros.id, retroId))
    .returning({ version: schema.retros.version });
  const v = rows[0]?.version ?? 0;
  bus.emit(`retro:${retroId}`, v);
  return v;
}

export async function getVersion(retroId: string) {
  const rows = await db.select({ version: schema.retros.version }).from(schema.retros).where(eq(schema.retros.id, retroId)).limit(1);
  return rows[0]?.version ?? null;
}

/** Wait until the retro version differs from `since`, or until timeout. Returns the current version. */
export async function waitForChange(retroId: string, since: number, timeoutMs: number, signal?: AbortSignal) {
  const current = await getVersion(retroId);
  if (current === null || current !== since) return current;
  return new Promise<number | null>((resolve) => {
    let done = false;
    const finish = (v: number | null) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(timer);
      bus.off(`retro:${retroId}`, onBump);
      signal?.removeEventListener("abort", onAbort);
      resolve(v);
    };
    const onBump = (v: number) => {
      if (v !== since) finish(v);
    };
    const onAbort = () => finish(since);
    const poll = setInterval(async () => {
      try {
        const v = await getVersion(retroId);
        if (v !== since) finish(v);
      } catch {
        /* ignore transient errors */
      }
    }, 1000);
    const timer = setTimeout(() => finish(since), timeoutMs);
    bus.on(`retro:${retroId}`, onBump);
    signal?.addEventListener("abort", onAbort);
  });
}
