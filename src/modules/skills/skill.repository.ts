import { prisma } from "../../config/prisma";

export const skillRepository = {
  listAll() {
    return prisma.skill.findMany({ orderBy: { name: "asc" } });
  },

  findById(id: string) {
    return prisma.skill.findUnique({ where: { id } });
  },

  listForUser(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { createdAt: "asc" },
    });
  },

  upsertUserSkill(userId: string, skillId: string, proficiency: string) {
    return prisma.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId, proficiency: proficiency as never },
      update: { proficiency: proficiency as never },
      include: { skill: true },
    });
  },

  findUserSkill(userId: string, skillId: string) {
    return prisma.userSkill.findUnique({ where: { userId_skillId: { userId, skillId } } });
  },

  updateUserSkillProficiency(userId: string, skillId: string, proficiency: string) {
    return prisma.userSkill.update({
      where: { userId_skillId: { userId, skillId } },
      data: { proficiency: proficiency as never },
      include: { skill: true },
    });
  },

  deleteUserSkill(userId: string, skillId: string) {
    return prisma.userSkill.delete({ where: { userId_skillId: { userId, skillId } } });
  },
};
