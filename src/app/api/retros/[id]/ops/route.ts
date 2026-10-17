import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { jsonError, unauthorized } from "@/server/http";
import { loadRetro } from "@/server/retro/context";
import { applyOp, type Op } from "@/server/retro/ops";
import { buildRetroState } from "@/server/retro/state";
import { bumpVersion } from "@/server/realtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: RouteContext<"/api/retros/[id]/ops">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;
    const body = (await req.json()) as { ops?: Op[]; returnState?: boolean };
    const ops = (body.ops ?? []).slice(0, 50);
    let rctx = await loadRetro(id, user, { join: true });
    const results: unknown[] = [];
    try {
      for (const op of ops) {
        results.push(await applyOp(rctx, op));
        rctx = await loadRetro(id, user);
      }
    } finally {
      // earlier ops in a batch may have changed data even if a later one failed
      if (ops.length) await bumpVersion(id);
    }
    if (body.returnState === false) return NextResponse.json({ results });
    const fresh = await loadRetro(id, user);
    return NextResponse.json({ results, state: await buildRetroState(fresh) });
  } catch (e) {
    return jsonError(e);
  }
}
