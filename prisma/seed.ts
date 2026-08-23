/**
 * Seed script — run with `bunx prisma db seed` (wired via package.json's
 * `prisma.seed` field). Populates enough data (20 users across all
 * experience levels/skills/ratings, 15 skills, badge catalog) that
 * matchmaking can be demoed immediately: join 8 seeded users to the queue
 * and a match forms right away.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const SKILLS: { name: string; category: string }[] = [
  { name: "React", category: "frontend" },
  { name: "Vue", category: "frontend" },
  { name: "Node.js", category: "backend" },
  { name: "Express", category: "backend" },
  { name: "PostgreSQL", category: "backend" },
  { name: "Python", category: "ai" },
  { name: "TensorFlow", category: "ai" },
  { name: "Docker", category: "devops" },
  { name: "Kubernetes", category: "devops" },
  { name: "AWS", category: "devops" },
  { name: "Swift", category: "mobile" },
  { name: "Flutter", category: "mobile" },
  { name: "Figma", category: "design" },
  { name: "TypeScript", category: "backend" },
  { name: "GraphQL", category: "backend" },
];

const BADGES: { code: string; name: string; description: string }[] = [
  { code: "FIRST_WIN", name: "First Win", description: "Won your first hackathon battle." },
  { code: "FIVE_WINS", name: "Five-Time Champion", description: "Won five hackathon battles." },
  { code: "WIN_STREAK", name: "On Fire", description: "Won three games in a row." },
  { code: "SPEED_CODER", name: "Speed Coder", description: "Submitted with time to spare." },
  { code: "AI_MASTER", name: "AI Master", description: "Built an outstanding AI-powered feature." },
  { code: "TEAM_PLAYER", name: "Team Player", description: "Consistently high team collaboration." },
  { code: "HACKATHON_CHAMPION", name: "Hackathon Champion", description: "Reached double-digit wins." },
];

const EXPERIENCE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;

const DEMO_USERS = Array.from({ length: 20 }, (_, i) => ({
  name: `Demo Player ${i + 1}`,
  email: `player${i + 1}@demo.hackbattle.dev`,
}));

async function main() {
  console.log("Seeding skills...");
  const skills = await Promise.all(
    SKILLS.map((s) =>
      prisma.skill.upsert({ where: { name: s.name }, create: s, update: {} })
    )
  );

  console.log("Seeding badges...");
  await Promise.all(
    BADGES.map((b) =>
      prisma.badge.upsert({ where: { code: b.code as never }, create: b as never, update: {} })
    )
  );

  console.log("Seeding demo users...");
  const passwordHash = await hashPassword("Password123");

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const { name, email } = DEMO_USERS[i];
    const experienceLevel = EXPERIENCE_LEVELS[i % EXPERIENCE_LEVELS.length];
    const rating = 900 + Math.floor(Math.random() * 500); // 900-1400 spread
    const coins = Math.floor(Math.random() * 300);
    const xp = Math.floor(Math.random() * 500);

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        name,
        email,
        passwordHash,
        rating,
        coins,
        xp,
        profile: {
          create: {
            bio: `Hi, I'm ${name}, a ${experienceLevel.toLowerCase()} developer.`,
            experienceLevel,
            preferredTechnologies: [],
            interests: [],
          },
        },
      },
      update: {},
    });

    // Give each user 2-4 random skills at varying proficiency.
    const shuffled = [...skills].sort(() => Math.random() - 0.5);
    const skillCount = 2 + Math.floor(Math.random() * 3);
    for (const skill of shuffled.slice(0, skillCount)) {
      const proficiency = EXPERIENCE_LEVELS[Math.floor(Math.random() * EXPERIENCE_LEVELS.length)];
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId: skill.id } },
        create: { userId: user.id, skillId: skill.id, proficiency },
        update: { proficiency },
      });
    }
  }

  console.log("Seed complete: 20 users, 15 skills, 7 badges.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
