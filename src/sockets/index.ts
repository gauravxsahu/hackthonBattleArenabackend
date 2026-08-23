import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { socketAuthMiddleware, type AuthenticatedSocket } from "./socketAuth";
import { registerGameSocketHandlers, bridgeGameEventsToSockets } from "./gameSocket";
import { logger } from "../utils/logger";

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const authed = socket as AuthenticatedSocket;
    logger.info("socket connected", { userId: authed.data.userId, socketId: socket.id });

    // Personal room so matchmaking (and future notifications) can target a
    // specific user even before they've joined a specific game room.
    socket.join(`user:${authed.data.userId}`);

    registerGameSocketHandlers(io, socket);

    socket.on("disconnect", () => {
      logger.info("socket disconnected", { userId: authed.data.userId, socketId: socket.id });
    });
  });

  bridgeGameEventsToSockets(io);

  return io;
}
