# Simple Retro

A calm, friendly place for a team, or a couple, to look back on the last few weeks and decide what to change.

Anyone can run one. The app walks everyone through four steps:

1. **Write.** Everyone adds cards on their own. Cards stay private until the next step.
2. **Group.** Drag similar cards together and give the group a short name.
3. **Vote.** Each person spends a few votes on what matters most.
4. **Discuss.** Talk through the top topics one at a time and agree on action items.

Action items stay on the team page, and the next retro opens with a quick check on them.

Built with Next.js 16, React 19, Tailwind CSS 4, Drizzle ORM and Postgres (Neon or any Postgres 14+).

## Features

- Teams with an invite link. People who only need to join one retro can do so with just their name, no account.
- Six formats, including a "Check-in for two" for couples. You can rename or add columns.
- Private writing, anonymous or named cards, and a set number of votes per person.
- Live updates for everyone in the room, with who's here, who's typing and who's done.
- The facilitator moves everyone from step to step, and can hand that role to someone else.
- A summary page at the end, which you can copy as text.
- Works on phones.
- Optional AI with **Claude or Gemini**: "Group for me", action ideas for a topic, and a written summary.

## Run it yourself

You need Node.js 20+, pnpm, and a Postgres database.

```bash
git clone <your fork url> simple-retro
cd simple-retro
pnpm install
cp .env.example .env.local     # set DATABASE_URL and APP_URL
pnpm db:push                   # create the tables
pnpm db:seed                   # optional demo data
pnpm dev
```

Open http://localhost:3000. With the demo data, sign in as `avery@example.com` with the password `simple-retro`.

For production, run `pnpm build && pnpm start`. Any host that runs Node works. On Vercel, add the Neon integration (or set `DATABASE_URL`) and set `APP_URL`.

### Using Neon

1. Create a project at [neon.tech](https://neon.tech) and copy the pooled connection string.
2. Set `DATABASE_URL` to it. URLs that contain `neon.tech` use the Neon serverless driver automatically (set `DB_DRIVER=pg` to force node-postgres).
3. Run `pnpm db:push`.

### AI (optional)

AI is off unless you add a key. Whoever hosts the app adds one key, and everyone using that copy of the app shares it.

| Variable | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | Use Claude (default model `claude-opus-5-5`) |
| `GEMINI_API_KEY` | Use Gemini (default model `gemini-flash-latest`) |
| `AI_PROVIDER` | `anthropic` or `gemini`, when both keys are set. Claude wins otherwise. |
| `AI_MODEL` | Use a different model from the chosen provider |

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `APP_URL` | yes | Public URL, used in invite and retro links |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` | no | AI features, see above |
| `DB_DRIVER` | no | `neon` or `pg`, to force a database driver |

There is no email. Passwords can't be reset by email. A host can clear `password_hash` for a user in the database, and the user can then sign up again with the same email.

## How it works

- **Realtime without extra infrastructure.** Every retro row has a `version` that each change increments. Browsers long-poll `GET /api/retros/:id/state?v=<version>`, which returns as soon as the version changes. Within one server process, waiting requests wake up at once through an in-memory event bus. Across serverless instances, the poll checks the database every second.
- **Per-person state.** The server builds each person's view, so private cards and other people's votes never reach the wrong browser.
- **One place for changes.** Every change to a retro goes through `src/server/retro/ops.ts`.

```
src/
  app/                pages, server actions and the two retro API routes
  components/retro/   the retro room (board, discussion, summary)
  components/team/    team page parts
  db/                 Drizzle schema and client
  lib/                shared types, formats, colors
  server/             auth, teams, AI, retro context/ops/state
scripts/seed.ts       demo data
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm typecheck` | Generate route types and run TypeScript |
| `pnpm lint` | ESLint |
| `pnpm db:push` | Sync the schema to the database |
| `pnpm db:seed` | Load demo data |

## License

[MIT](LICENSE)
