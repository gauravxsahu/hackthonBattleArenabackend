import type { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthenticatedSocket extends Socket {
  data: { userId: string; role: string };
}

/** Expects the client to connect with `auth: { token: '<accessToken>' }`. */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error("Missing auth token"));
  }
  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    next();
  } catch {
    next(new Error("Invalid or expired auth token"));
  }
}
