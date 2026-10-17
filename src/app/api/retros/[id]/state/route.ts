import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/server/auth";
import { jsonError, unauthorized } from "@/server/http";
import { loadRetro } from "@/server/retro/context";
import { buildRetroState } from "@/server/retro/state";
import { waitForChange } from "@/server/realtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/retros/[id]/state">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;
    const since = Number(req.nextUrl.searchParams.get("v") ?? "-1");
    let rctx = await loadRetro(id, user, { join: true });
    const p = rctx.participant;
    if (p && Date.now() - p.lastSeenAt.getTime() > 10_000) {
      await db
        .update(schema.participants)
        .set({ lastSeenAt: new Date() })
        .where(and(eq(schema.participants.retroId, id), eq(schema.participants.userId, user.id)));
    }
    if (since >= 0 && since === rctx.retro.version) {
      const v = await waitForChange(id, since, 25_000, req.signal);
      if (v === since) return NextResponse.json({ unchanged: true, version: since });
      rctx = await loadRetro(id, user);
    }
    return NextResponse.json(await buildRetroState(rctx), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return jsonError(e);
  }
}
