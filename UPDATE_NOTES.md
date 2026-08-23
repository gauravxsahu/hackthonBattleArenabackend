# What changed in this update

## ⚠️ Action required: new database migration

The Prisma schema changed (new `GameMode` enum, `Game.mode`, `Challenge.mode`,
`Challenge.starterCode`). Your existing migration
(`prisma/migrations/20260822162016`) does **not** include these — you must
generate a new migration before starting the backend:

```bash
cd hackathon-battle-arena
bunx prisma migrate dev --name add_game_modes
```

This will create and apply a new migration file. Your existing data (users,
past games, etc.) is preserved — this only adds new columns/enum, nothing
is dropped.

## New game modes

| Mode | Players | Duration | How it's entered |
|---|---|---|---|
| `BATTLE` (original) | 4 (2v2) | 30 min (`.env` configurable) | Matchmaking queue |
| `BUG_FIX` | 2 (1v1) | 15 min | Matchmaking queue (separate queue from BATTLE) |
| `PRACTICE` | 1 (solo) | 30 min | Instant start, no queue |
| `FRIEND_CHALLENGE` | 2 (1v1) | 15 min | Invite code (30-min expiry), no queue |

Per-mode rules live in one place: `src/config/gameModes.ts` (backend) and
`src/utils/constants.js` → `GAME_MODES` (frontend, kept in sync manually).

## New backend endpoints

- `POST /api/practice/start` — starts a solo practice game immediately
- `POST /api/friend-challenge/create` — generates a 6-character invite code (30 min TTL)
- `POST /api/friend-challenge/join` — `{ code }`, creates the 1v1 game and notifies the creator via the existing `matchmaking:matched` socket event
- `POST /api/matchmaking/join`, `/leave`, `GET /status` now all take a `mode` (`BATTLE` or `BUG_FIX`) — defaults to `BATTLE` if omitted, so old clients still work
- `GET /api/users/search?q=` — name search for the new search overlay (re-applied in this update; it was missing from the previously uploaded copy)

## New frontend routes

- `/play` — mode-selection page (new default landing point for "Play" in the nav)
- `/practice` — solo practice start screen
- `/friend-challenge` — create/join a friend invite
- `/matchmaking?mode=BATTLE` or `?mode=BUG_FIX` — same page as before, now mode-aware
- `/users/:userId` — public player profile (from the search feature)

## Bug-Fix mode specifics

- The AI is prompted differently for `BUG_FIX`: it returns a `starterCode`
  string (buggy code) alongside the usual title/description/requirements.
  `ChallengePanel.jsx` renders this in a code block with a copy button when
  present.
- If no `AI_API_KEY` is configured, a deterministic mock buggy snippet is
  used instead (same fallback pattern as the original build-mode mock).
- Evaluation reuses the existing hybrid automated+AI pipeline unchanged —
  no new evaluation infrastructure was needed.

## Practice mode specifics

- No rating change, no win/loss counter change — by design, so players
  can't inflate their competitive standing by grinding solo games.
- Reward is a small coin+XP bonus scaled to the AI-evaluated score
  (`rewardsService.applyPracticeReward`), recorded as a `BONUS`-type
  `CoinTransaction` for auditability, same pattern as win/loss rewards.

## Known limitations / what to test first

- This was built and verified via static syntax/import checks only (no
  live Bun/PostgreSQL/Redis available in the environment this was built
  in) — please run through each new mode once end-to-end after applying
  the migration.
- The Bug-Fix mode's automated checks still use the same keyword-matching
  heuristic as the original build mode (checks your submission description
  mentions each requirement) — it does not actually execute your fixed
  code. This mirrors the original build-mode's documented limitation.
