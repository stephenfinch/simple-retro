/**
 * Seeds demo data: three people, one team, a finished retro and some action items.
 *
 *   pnpm db:seed
 *
 * Then sign in as avery@example.com with the password simple-retro.
 */
import Module from "node:module";
import path from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Server modules import "server-only", which throws outside Next.js. Point it at an empty module.
const M = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolve = M._resolveFilename;
M._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return path.join(__dirname, "empty-module.cjs");
  return resolve.call(this, request, ...rest);
};

const PASSWORD = "simple-retro";

async function main() {
  const { db, schema } = await import("../src/db");
  const { createUser, findUserByEmail } = await import("../src/server/auth");
  const { createTeam } = await import("../src/server/teams");
  const { templateByKey } = await import("../src/lib/templates");
  const { DEFAULT_SETTINGS } = await import("../src/lib/types");

  if (await findUserByEmail("avery@example.com")) {
    console.log("Demo data is already there. Sign in as avery@example.com /", PASSWORD);
    process.exit(0);
  }

  const avery = await createUser({ email: "avery@example.com", name: "Avery Johnson", password: PASSWORD });
  const blake = await createUser({ email: "blake@example.com", name: "Blake Chen", password: PASSWORD });
  const casey = await createUser({ email: "casey@example.com", name: "Casey Okafor", password: PASSWORD });

  const team = await createTeam("Product Squad", avery.id);
  await db.insert(schema.teamMembers).values([
    { teamId: team.id, userId: blake.id },
    { teamId: team.id, userId: casey.id },
  ]);

  // A retro from two weeks ago
  const at = new Date(Date.now() - 14 * 86400_000);
  const columns = templateByKey("classic").columns.map((c, i) => ({ ...c, id: `c${i + 1}` }));
  const [retro] = await db
    .insert(schema.retros)
    .values({ teamId: team.id, title: "Sprint 41 retro", columns, settings: DEFAULT_SETTINGS, step: "done", facilitatorId: avery.id, createdAt: at, closedAt: new Date(at.getTime() + 50 * 60_000) })
    .returning();
  await db.insert(schema.participants).values([avery, blake, casey].map((u) => ({ retroId: retro.id, userId: u.id, joinedAt: at, lastSeenAt: at })));

  const [g1] = await db.insert(schema.groups).values({ retroId: retro.id, columnId: "c2", title: "Too many meetings" }).returning();
  const card = async (columnId: string, authorId: string, text: string, groupId: string | null = null) => {
    const [row] = await db.insert(schema.cards).values({ retroId: retro.id, columnId, authorId, text, groupId, position: Date.now() + Math.random(), createdAt: at }).returning();
    return row;
  };
  await card("c1", avery.id, "Shipped the new onboarding on time");
  const pairing = await card("c1", blake.id, "Pairing on the tricky bugs helped a lot");
  await card("c1", casey.id, "Great support from design");
  await card("c2", blake.id, "Monday planning runs over two hours", g1.id);
  await card("c2", casey.id, "Hard to find focus time", g1.id);
  const ci = await card("c2", avery.id, "Flaky tests slow down every merge");
  await card("c3", casey.id, "Try a no-meeting afternoon each week");
  await card("c3", blake.id, "Write decisions down in one place");

  const vote = (userId: string, targetId: string) => ({ retroId: retro.id, userId, targetId, createdAt: at });
  await db.insert(schema.votes).values([
    vote(avery.id, g1.id),
    vote(blake.id, g1.id),
    vote(casey.id, g1.id),
    vote(casey.id, g1.id),
    vote(avery.id, ci.id),
    vote(blake.id, ci.id),
    vote(avery.id, pairing.id),
  ]);

  await db.insert(schema.actions).values([
    { teamId: team.id, retroId: retro.id, sourceId: g1.id, text: "Keep Monday planning to 45 minutes", ownerId: avery.id, createdById: avery.id, createdAt: at },
    { teamId: team.id, retroId: retro.id, sourceId: ci.id, text: "Set up automatic retries for flaky tests", ownerId: blake.id, createdById: avery.id, createdAt: at, doneAt: new Date() },
    { teamId: team.id, retroId: retro.id, sourceId: pairing.id, text: "Book two pairing sessions each week", ownerId: casey.id, createdById: avery.id, createdAt: at },
  ]);

  console.log("Seeded. Sign in as avery@example.com /", PASSWORD);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
