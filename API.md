# API Reference

Base URL: `http://localhost:4000/api`

All responses: `{ "success": true, "data": ... }` or
`{ "success": false, "message": "...", "code": "..." }`.

Authenticated routes require `Authorization: Bearer <accessToken>`.

## Auth

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /auth/register | - | `{ name, email, password }` |
| POST | /auth/login | - | `{ email, password }` |
| POST | /auth/logout | - | (uses refresh cookie) |
| POST | /auth/refresh | - | (uses refresh cookie) |
| GET | /auth/me | ✓ | - |

Login/register set an HTTP-only `refreshToken` cookie (scoped to
`/api/auth`) and return `{ accessToken, user? }`.

## Profile

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | /profile | ✓ | - |
| PUT | /profile | ✓ | `{ bio?, avatar?, experienceLevel?, githubUrl?, linkedinUrl?, preferredTechnologies?, interests? }` |

## Skills

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | /skills | - | - (catalog) |
| GET | /profile/skills | ✓ | - |
| POST | /profile/skills | ✓ | `{ skillId, proficiency }` |
| PUT | /profile/skills/:skillId | ✓ | `{ proficiency }` |
| DELETE | /profile/skills/:skillId | ✓ | - |

## Matchmaking

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /matchmaking/join | ✓ | - |
| POST | /matchmaking/leave | ✓ | - |
| GET | /matchmaking/status | ✓ | - |

`status` returns `{ inQueue, queuePosition, queueSize, matchedGameId }`.
When `MATCH_PLAYERS_REQUIRED` players are queued (4 by default — a 2v2
match), teams form automatically and a `matchmaking:matched`
socket event is sent to each matched player's personal room (`user:<id>`).

## Games

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | /games | ✓ | - (this user's game history, most recent first) |
| GET | /games/:gameId | ✓ (member) | - |
| POST | /games/:gameId/ready | ✓ (member) | - |
| GET | /games/:gameId/players | ✓ (member) | - |
| GET | /games/:gameId/messages | ✓ (member) | - (persisted chat history; `?before=&limit=`) |
| GET | /games/:gameId/result | ✓ (member) | - |
| GET | /games/:gameId/rewards/me | ✓ (member) | - (this user's coin/XP/rating deltas for this game) |
| POST | /games/:gameId/submissions | ✓ (member) | `{ githubUrl, demoUrl?, description }` |
| GET | /games/:gameId/submissions | ✓ (member) | - |

Game lifecycle: `WAITING → TEAM_FORMING → READY → RUNNING → SUBMISSION →
EVALUATING → COMPLETED` (or `CANCELLED`).

`GET /games/:gameId/result` includes each team's submission and, once
scored, its `evaluation` (automatedResults, automatedScore, aiResults,
aiScore, finalScore).

## Challenges

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /challenges/generate | ✓ (admin) | `{ duration, teamLevel, skills[] }` |
| GET | /challenges/:challengeId | ✓ | - |

Challenges are normally generated automatically by the game service once a
match's teams are all ready; the `generate` endpoint is for admin preview.

## Leaderboard

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | /leaderboard?limit=50 | - | - |
| GET | /leaderboard/me | ✓ | - |

## Users

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | /users/:userId | ✓ | - (public profile) |

## Socket.IO

Connect: `io(url, { auth: { token: accessToken } })`

Client → server events: `game:join { gameId }`, `game:ready { gameId }`,
`game:message { gameId, content }`, `game:submission { gameId }`

Server → client events: `game:start`, `game:timer`, `game:player-status`,
`game:submission`, `game:end`, `game:result`, `game:message`,
`matchmaking:matched`
