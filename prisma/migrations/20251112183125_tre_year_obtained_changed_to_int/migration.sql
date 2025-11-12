/*
  Warnings:

  - Changed the type of `yearOfAcquisition` on the `tre` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `effective_enjoyment` on the `tre` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `effective_enjoyment` on the `vacations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EffectiveEnjoymentEnum" AS ENUM ('PARTIAL', 'YES', 'NO');

-- AlterEnum
ALTER TYPE "TreRequestType" ADD VALUE 'CANCELAMENTO_DE_GOZO';

-- AlterEnum
ALTER TYPE "VacationRequestType" ADD VALUE 'SUSPENSAO_DE_GOZO';

-- AlterTable
ALTER TABLE "tre" DROP COLUMN "yearOfAcquisition",
ADD COLUMN     "yearOfAcquisition" INTEGER NOT NULL,
DROP COLUMN "effective_enjoyment",
ADD COLUMN     "effective_enjoyment" "EffectiveEnjoymentEnum" NOT NULL;

-- AlterTable
ALTER TABLE "vacations" DROP COLUMN "effective_enjoyment",
ADD COLUMN     "effective_enjoyment" "EffectiveEnjoymentEnum" NOT NULL;
