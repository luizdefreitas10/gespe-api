/*
  Warnings:

  - You are about to drop the `Tre` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "Tre" DROP CONSTRAINT "Tre_user_Id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "Tre";

-- CreateTable
CREATE TABLE "tre" (
    "id" TEXT NOT NULL,
    "user_Id" TEXT NOT NULL,
    "firstTreDay" TIMESTAMP(3),
    "lastTreDay" TIMESTAMP(3),
    "treSeiNumber" TEXT,
    "requestType" "TreRequestType" NOT NULL,
    "yearOfAcquisition" TIMESTAMP(3) NOT NULL,
    "amoutOfTreDays" INTEGER NOT NULL DEFAULT 0,
    "observations" TEXT,
    "effective_enjoyment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tre_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tre" ADD CONSTRAINT "tre_user_Id_fkey" FOREIGN KEY ("user_Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
