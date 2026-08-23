import type { Server, Socket } from "socket.io";
import { gameRepository } from "../modules/games/game.repository";
import { gameService } from "../modules/games/game.service";
import { gameEvents } from "../services/gameEvents";
import { prisma } from "../config/prisma";
import { gameRoom } from "./rooms";
import { logger } from "../utils/logger";
import type { AuthenticatedSocket } from "./socketAuth";

async function persistAndBroadcastMessage(io: Server, gameId: string, userId: string, content: string) {
  const message = await prisma.message.create({
    data: { gameId, userId, content },
    include: { user: { select: { id: true, name: true } } },
  });
  io.to(gameRoom(gameId)).emit("game:message", {
    id: message.id,
    gameId,
    userId,
    userName: message.user.name,
    content: message.content,
    createdAt: message.createdAt,
  });
}

export function registerGameSocketHandlers(io: Server, socket: Socket) {
  const authed = socket as AuthenticatedSocket;
  const userId = authed.data.userId;

  socket.on("game:join", async (payload: { gameId: string }, ack?: (res: unknown) => void) => {
    try {
      const membership = await gameRepository.isUserInGame(payload.gameId, userId);
      if (!membership) {
        ack?.({ success: false, message: "Not a participant in this game" });
        return;
      }
      socket.join(gameRoom(payload.gameId));
      ack?.({ success: true });
    } catch (err) {
      logger.error("game:join failed", { error: String(err) });
      ack?.({ success: false, message: "Failed to join game room" });
    }
  });

  socket.on("game:ready", async (payload: { gameId: string }, ack?: (res: unknown) => void) => {
    try {
      const result = await gameService.markReady(payload.gameId, userId);
      ack?.({ success: true, data: result });
    } catch (err) {
      ack?.({ success: false, message: err instanceof Error ? err.message : "Failed to mark ready" });
    }
  });

  socket.on("game:message", async (payload: { gameId: string; content: string }, ack?: (res: unknown) => void) => {
    try {
      if (!payload.content || payload.content.trim().length === 0 || payload.content.length > 2000) {
        ack?.({ success: false, message: "Message must be 1-2000 characters" });
        return;
      }
      const membership = await gameRepository.isUserInGame(payload.gameId, userId);
      if (!membership) {
        ack?.({ success: false, message: "Not a participant in this game" });
        return;
      }
      await persistAndBroadcastMessage(io, payload.gameId, userId, payload.content.trim());
      ack?.({ success: true });
    } catch (err) {
      logger.error("game:message failed", { error: String(err) });
      ack?.({ success: false, message: "Failed to send message" });
    }
  });

  socket.on("game:submission", async (payload: { gameId: string }, ack?: (res: unknown) => void) => {
    // Lightweight ping so teammates see "submission in progress" in the UI;
    // the actual submission still goes through POST /api/games/:id/submissions.
    io.to(gameRoom(payload.gameId)).emit("game:submission", { gameId: payload.gameId, userId });
    ack?.({ success: true });
  });

  socket.on("disconnect", () => {
    // Socket.IO automatically leaves all rooms on disconnect; nothing else to clean up.
  });
}

/** Wires the cross-module gameEvents emitter into Socket.IO room broadcasts. Call once at server startup. */
export function bridgeGameEventsToSockets(io: Server) {
  gameEvents.onTyped("game:start", (payload) => io.to(gameRoom(payload.gameId)).emit("game:start", payload));
  gameEvents.onTyped("game:timer", (payload) => io.to(gameRoom(payload.gameId)).emit("game:timer", payload));
  gameEvents.onTyped("game:submission-phase", (payload) =>
    io.to(gameRoom(payload.gameId)).emit("game:submission", { phase: "SUBMISSION", ...payload })
  );
  gameEvents.onTyped("game:evaluating", (payload) =>
    io.to(gameRoom(payload.gameId)).emit("game:submission", { phase: "EVALUATING", ...payload })
  );
  gameEvents.onTyped("game:end", (payload) => io.to(gameRoom(payload.gameId)).emit("game:end", payload));
  gameEvents.onTyped("game:result", (payload) => io.to(gameRoom(payload.gameId)).emit("game:result", payload));
  gameEvents.onTyped("game:player-status", (payload) =>
    io.to(gameRoom(payload.gameId)).emit("game:player-status", payload)
  );
  gameEvents.onTyped("matchmaking:matched", (payload) => {
    for (const userId of payload.userIds) {
      io.to(`user:${userId}`).emit("matchmaking:matched", { gameId: payload.gameId });
    }
  });
  gameEvents.onTyped("game:cancelled", (payload) => io.to(gameRoom(payload.gameId)).emit("game:cancelled", payload));
}