# Hackathon Battle Arena — Backend

AI-powered competitive hackathon platform: profile-based skill matchmaking,
balanced team formation (2v2 by default — configurable via `MATCH_TEAM_SIZE`),
a server-authoritative 30-minute build sprint,
hybrid automated + AI evaluation, and a coin/XP/rating leaderboard.

Modular monolith. Runtime: **Bun** (not Node). No Zod anywhere — all request
and AI-response validation is hand-rolled (see `src/utils/validation/`).

## Tech stack

- Bun.js runtime + package manager
- Express.js + TypeScript
- PostgreSQL via Prisma
- Redis (matchmaking queue, leaderboard sorted set)
- Socket.IO (real-time game rooms: chat, timer, state events)
- JWT access + refresh tokens (refresh token in an HTTP-only cookie)
- `Bun.password` (argon2id) for password hashing
- Custom validation system (no Zod)

## Getting started

```bash
bun install
cp .env.example .env    # fill in DATABASE_URL, REDIS_URL, JWT secrets, AI_API_KEY
bunx prisma generate
bunx prisma migrate dev
bunx prisma db seed
bun run dev
```

Production:

```bash
bun run build
bun run start
```

Tests:

```bash
bun test
```

Do **not** use `npm`/`yarn`/`pnpm`/`node` anywhere in this project — Bun is
the runtime and package manager end to end.

## Folder structure

```
src/
├── config/         # env, prisma client, redis client
├── modules/        # one folder per domain: controller/service/repository/routes/validation/types
│   ├── auth/ users/ profiles/ skills/ matchmaking/ games/
│   ├── challenges/ submissions/ evaluation/ rewards/ leaderboard/ notifications/
├── sockets/         # Socket.IO auth + game room handlers
├── middleware/      # auth, error handling, security (helmet/cors/rate-limit)
├── utils/           # validation system, jwt, password, logger, response helpers
├── services/        # cross-module domain services (rating, team formation, skill scoring,
│                    #   AI client, game timer, game event bus)
├── app.ts           # Express app wiring
└── server.ts         # HTTP + Socket.IO bootstrap
prisma/
├── schema.prisma
└── seed.ts
```

## Validation architecture (no Zod)

- `src/utils/validation/validators.ts` — reusable primitive validators
  (`validateEmail`, `validatePassword`, `validateRequiredString`,
  `validateEnum`, `validateUrl`, `validateArray`, `validateUuid`, ...).
  Each returns `{ valid: true, value }` or `{ valid: false, message }`.
- `src/utils/validation/validate.ts` — `runValidation(source, schema)` composes
  field validators into a schema, collecting **all** field errors before
  throwing a single `ValidationError`.
- `src/utils/validation/common.ts` — Express middleware factories
  `validateBody()`, `validateQuery()`, `validateParams()`.
- `src/utils/validation/aiResponses.ts` — hand-rolled validators for the AI
  challenge-generation and AI-evaluation JSON payloads
  (`validateChallengeResponse`, `validateAIEvaluationResponse`), including
  the "evaluation criteria must sum to 100" business rule.
- `src/utils/validation/errors.ts` — `AppError` hierarchy + centralized
  response shape, consumed by `middleware/errorHandler.ts`.

## Error / response format

Success:

```json
{ "success": true, "data": { } }
```

Error:

```json
{ "success": false, "message": "Game has already ended", "code": "GAME_ENDED" }
```

## Key business rules enforced

- A player cannot join the matchmaking queue while already in an active game
  (`matchmaking.service.ts` checks `findActiveGameForUser` first).
- A player cannot submit after the deadline (`submission.service.ts` checks
  game status + a fixed grace window against the server-side `endTime`).
- Final evaluation scores are always computed server-side
  (`evaluation.service.ts`); the frontend never supplies or edits scores.
- A player can only update their own profile — routes never take a
  `:userId` for profile mutation, only `req.user.id` from the JWT.
- Rewards use an append-only `CoinTransaction` / `RatingHistory` ledger
  rather than mutating `coins`/`rating` directly, for auditability.
- The 30-minute game timer is server-authoritative
  (`services/gameTimerService.ts`); the frontend only ever computes
  `endTime - now` for display.

## Real-time events (Socket.IO, room `game:<gameId>`)

Client → server: `game:join`, `game:ready`, `game:message`, `game:submission`

Server → client: `game:start`, `game:timer`, `game:player-status`,
`game:submission`, `game:end`, `game:result`

Connect with `io(url, { auth: { token: '<accessToken>' } })`.

## REST API

See `API.md` for the full endpoint reference.

## AI integration

`src/services/aiClient.ts` wraps a single `POST /v1/messages`-shaped call.
`AIChallengeService` and `AIEvaluationService` (in `modules/challenges` and
`modules/evaluation`) each fall back to a deterministic mock implementation
when `AI_API_KEY` is unset, so the whole flow — matchmaking → challenge →
timer → submission → evaluation → rewards → leaderboard — is fully
demoable without a live AI key.

## Notes / things to swap for a real production deployment

- `gameTimerService` keeps timers in-process (a `Map`), fine for a single
  instance; a multi-instance deployment should move this to a distributed
  delayed-job queue.
- `automatedCheckService` does a lightweight reachability + keyword-coverage
  check in place of actually cloning and running the submitted repo.
