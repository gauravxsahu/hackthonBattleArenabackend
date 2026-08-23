import { prisma } from "../../config/prisma";
import type { UpdateProfileInput } from "./profile.types";

export const profileRepository = {
  findByUserId(userId: string) {
    return prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true, rating: true, coins: true, xp: true, wins: true, losses: true } } },
    });
  },

  upsert(userId: string, data: UpdateProfileInput) {
    return prisma.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data },
      include: { user: { select: { id: true, name: true, email: true, rating: true, coins: true, xp: true, wins: true, losses: true } } },
    });
  },
};
