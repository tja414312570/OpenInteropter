-- CreateTable
CREATE TABLE "History" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "lastVisitTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);