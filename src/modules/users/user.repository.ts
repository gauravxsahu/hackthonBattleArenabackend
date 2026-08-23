import { prisma } from "../../config/prisma";

export const userRepository = {
  /** Name-search for the search overlay — small, fast result set (id/name/rating/avatar only). */
  searchByName(query: string, limit = 10) {
    return prisma.user.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        rating: true,
        profile: { select: { avatar: true } },
      },
      orderBy: { rating: "desc" },
      take: limit,
    });
  },

  findPublicById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        rating: true,
        coins: true,
        xp: true,
        wins: true,
        losses: true,
        createdAt: true,
        profile: {
          select: {
            bio: true,
            avatar: true,
            experienceLevel: true,
            githubUrl: true,
            linkedinUrl: true,
            preferredTechnologies: true,
            interests: true,
          },
        },
        skills: { include: { skill: true } },
        badges: { include: { badge: true } },
      },
    });
  },
};
