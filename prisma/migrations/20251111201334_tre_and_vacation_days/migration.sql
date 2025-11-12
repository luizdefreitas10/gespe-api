/*
  Warnings:

  - You are about to drop the column `days` on the `Tre` table. All the data in the column will be lost.
  - You are about to drop the column `treRequestDay` on the `Tre` table. All the data in the column will be lost.
  - You are about to drop the column `days` on the `vacations` table. All the data in the column will be lost.
  - Made the column `birthDate` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Tre" DROP COLUMN "days",
DROP COLUMN "treRequestDay",
ADD COLUMN     "amoutOfTreDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstTreDay" TIMESTAMP(3),
ADD COLUMN     "lastTreDay" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "birthDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "vacations" DROP COLUMN "days",
ADD COLUMN     "amoutOfVacationDays" INTEGER NOT NULL DEFAULT 0;
