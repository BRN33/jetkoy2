import { lt, eq, and, inArray } from "drizzle-orm";
import { db, jobsTable, commissionsTable } from "@workspace/db";
import { logger } from "./lib/logger";

const AVAILABLE_TTL_MS = 60 * 60 * 1000;      // 1 saat
const GRABBED_TTL_MS  = 24 * 60 * 60 * 1000;  // 24 saat
const INTERVAL_MS     = 5 * 60 * 1000;         // her 5 dakikada bir

async function runCleanup(): Promise<void> {
  const now = new Date();

  const availableCutoff = new Date(now.getTime() - AVAILABLE_TTL_MS);
  const grabbedCutoff   = new Date(now.getTime() - GRABBED_TTL_MS);

  // Silinecek iş id'lerini topla
  const expiredAvailable = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(and(eq(jobsTable.status, "available"), lt(jobsTable.createdAt, availableCutoff)));

  const expiredGrabbed = await db
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(and(eq(jobsTable.status, "grabbed"), lt(jobsTable.createdAt, grabbedCutoff)));

  const toDelete = [
    ...expiredAvailable.map((r) => r.id),
    ...expiredGrabbed.map((r) => r.id),
  ];

  if (toDelete.length === 0) return;

  // Onlara ait komisyonları sil (FK kısıtı nedeniyle önce)
  await db
    .delete(commissionsTable)
    .where(inArray(commissionsTable.jobId, toDelete));

  // Artık işleri sil
  await db
    .delete(jobsTable)
    .where(inArray(jobsTable.id, toDelete));

  logger.info(
    {
      deletedAvailable: expiredAvailable.length,
      deletedGrabbed: expiredGrabbed.length,
    },
    "Otomatik temizlik tamamlandi"
  );
}

export function startCleanupScheduler(): void {
  // Sunucu ayaga kalkinca ilk temizligi hemen calistir
  runCleanup().catch((err) =>
    logger.error({ err }, "Ilk temizlik calistirilamadi")
  );

  setInterval(() => {
    runCleanup().catch((err) =>
      logger.error({ err }, "Zamanlanmis temizlik basarisiz")
    );
  }, INTERVAL_MS);
}
