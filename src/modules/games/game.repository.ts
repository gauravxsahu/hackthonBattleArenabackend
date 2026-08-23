import { prisma } from "../../config/prisma";
import type { FormedTeamInput } from "./game.types";
import type { GameMode } from "../../config/gameModes";

const gameIncludeFull = {
  teams: {
    include: {
      members: { include: { user: { select: { id: true, name: true, rating: true } } } },
      submissions: { include: { evaluation: true } },
    },
  },
  challenge: true,
} as const;

export const gameRepository = {
  /** Creates a WAITING game with the given team(s) already assigned (1 team for PRACTICE, 2 for every other mode). */
  createWithTeams(teams: FormedTeamInput[], mode: GameMode) {
    return prisma.game.create({
      data: {
        status: "TEAM_FORMING",
        mode: mode as never,
        teams: {
          create: teams.map((team) => ({
            side: team.side,
            members: { create: team.userIds.map((userId) => ({ userId })) },
          })),
        },
      },
      include: gameIncludeFull,
    });
  },

  findById(gameId: string) {
    return prisma.game.findUnique({ where: { id: gameId }, include: gameIncludeFull });
  },

  findActiveGameForUser(userId: string) {
    return prisma.game.findFirst({
      where: {
        status: { in: ["WAITING", "TEAM_FORMING", "READY", "RUNNING", "SUBMISSION", "EVALUATING"] },
        teams: { some: { members: { some: { userId } } } },
      },
    });
  },

  /** Game history for a user, most recent first — backs GET /api/games. */
  listForUser(userId: string, opts: { limit?: number } = {}) {
    return prisma.game.findMany({
      where: { teams: { some: { members: { some: { userId } } } } },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 20,
      include: gameIncludeFull,
    });
  },

  isUserInGame(gameId: string, userId: string) {
    return prisma.teamMember.findFirst({ where: { userId, team: { gameId } } });
  },

  setReady(gameId: string, userId: string) {
    return prisma.teamMember.updateMany({
      where: { userId, team: { gameId } },
      data: { isReady: true },
    });
  },

  countReadyMembers(gameId: string) {
    return prisma.teamMember.count({ where: { team: { gameId }, isReady: true } });
  },

  countTotalMembers(gameId: string) {
    return prisma.teamMember.count({ where: { team: { gameId } } });
  },

  updateStatus(gameId: string, status: string, extra: Record<string, unknown> = {}) {
    return prisma.game.update({ where: { id: gameId }, data: { status: status as never, ...extra } });
  },

  attachChallenge(gameId: string, challengeId: string) {
    return prisma.game.update({ where: { id: gameId }, data: { challengeId } });
  },

  startGame(gameId: string, startTime: Date, endTime: Date) {
    return prisma.game.update({
      where: { id: gameId },
      data: { status: "RUNNING", startTime, endTime },
    });
  },

  setWinner(gameId: string, winnerTeamId: string) {
    return prisma.game.update({ where: { id: gameId }, data: { status: "COMPLETED", winnerTeamId } });
  },

  findTeamsForGame(gameId: string) {
    return prisma.team.findMany({
      where: { gameId },
      include: { members: { include: { user: true } } },
    });
  },

  /** Persisted chat history for a game room, oldest first (paginated via `before`/`limit`). */
  listMessages(gameId: string, opts: { before?: Date; limit?: number } = {}) {
    return prisma.message
      .findMany({
        where: { gameId, ...(opts.before ? { createdAt: { lt: opts.before } } : {}) },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: opts.limit ?? 50,
      })
      .then((rows) => rows.reverse());
  },

  listPlayers(gameId: string) {
    return prisma.teamMember.findMany({
      where: { team: { gameId } },
      include: { user: { select: { id: true, name: true, rating: true } }, team: true },
    });
  },
};
