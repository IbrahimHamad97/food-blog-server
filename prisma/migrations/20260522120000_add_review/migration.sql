-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('dine_in', 'delivery');

-- CreateEnum
CREATE TYPE "PriceCurrency" AS ENUM ('USD', 'QAR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "partySize" INTEGER,
    "meals" JSONB NOT NULL,
    "nutrition" JSONB,
    "currency" "PriceCurrency" NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "rating" INTEGER NOT NULL,
    "cuisineTags" TEXT[],
    "foodTypeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrls" TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
