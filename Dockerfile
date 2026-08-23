FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run start"]