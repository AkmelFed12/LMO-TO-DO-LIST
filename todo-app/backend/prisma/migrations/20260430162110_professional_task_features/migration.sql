-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "workspace" TEXT NOT NULL DEFAULT 'Personal',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "tags" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'None',
    "dueDate" DATETIME,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "actualMinutes" INTEGER NOT NULL DEFAULT 0,
    "focusMinutes" INTEGER NOT NULL DEFAULT 25,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("completed", "createdAt", "description", "id", "title", "updatedAt", "userId") SELECT "completed", "createdAt", "description", "id", "title", "updatedAt", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
