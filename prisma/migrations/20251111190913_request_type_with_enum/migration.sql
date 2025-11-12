/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'GESTOR');

-- CreateEnum
CREATE TYPE "VacationRequestType" AS ENUM ('ALTERACAO_DE_GOZO', 'PROGRAMACAO_DE_FERIAS', 'SOLICITACAO_DE_GOZO');

-- CreateEnum
CREATE TYPE "TreRequestType" AS ENUM ('INCLUIR_SALDO', 'SOLICITACAO_DE_GOZO');

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_categoryId_fkey";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "registry" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "totalVacationDays" INTEGER NOT NULL DEFAULT 0,
    "totalTreDays" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "firstVacationDay" TIMESTAMP(3) NOT NULL,
    "lastVacationDay" TIMESTAMP(3) NOT NULL,
    "vacationSeiNumber" TEXT,
    "requestType" "VacationRequestType" NOT NULL,
    "year" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "observations" TEXT,
    "effective_enjoyment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tre" (
    "id" TEXT NOT NULL,
    "user_Id" TEXT NOT NULL,
    "treRequestDay" TIMESTAMP(3) NOT NULL,
    "treSeiNumber" TEXT,
    "requestType" "TreRequestType" NOT NULL,
    "yearOfAcquisition" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "observations" TEXT,
    "effective_enjoyment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_registry_key" ON "users"("registry");

-- AddForeignKey
ALTER TABLE "vacations" ADD CONSTRAINT "vacations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tre" ADD CONSTRAINT "Tre_user_Id_fkey" FOREIGN KEY ("user_Id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
