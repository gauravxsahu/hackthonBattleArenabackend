import type { Response } from "express";

/** Sends { success: true, data } in the project's standard envelope. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}
