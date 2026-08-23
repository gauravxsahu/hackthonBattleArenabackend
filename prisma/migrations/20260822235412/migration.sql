-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('BATTLE', 'BUG_FIX', 'PRACTICE', 'FRIEND_CHALLENGE');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "mode" "GameMode" NOT NULL DEFAULT 'BATTLE',
ADD COLUMN     "starterCode" TEXT;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "mode" "GameMode" NOT NULL DEFAULT 'BATTLE';

-- CreateIndex
CREATE INDEX "Game_mode_idx" ON "Game"("mode");
