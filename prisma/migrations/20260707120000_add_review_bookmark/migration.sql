-- CreateTable
CREATE TABLE "ReviewBookmark" (
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewBookmark_pkey" PRIMARY KEY ("userId","reviewId")
);

-- CreateIndex
CREATE INDEX "ReviewBookmark_reviewId_idx" ON "ReviewBookmark"("reviewId");

-- AddForeignKey
ALTER TABLE "ReviewBookmark" ADD CONSTRAINT "ReviewBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewBookmark" ADD CONSTRAINT "ReviewBookmark_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
