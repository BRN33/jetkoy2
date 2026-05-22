import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./lib/logger";

const ADMIN_PHONE = "5388717379";

export async function seedAdmin(): Promise<void> {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, ADMIN_PHONE));

    if (!user) {
      logger.info({ phone: ADMIN_PHONE }, "Admin kullanicisi bulunamadi, seed atlanıyor");
      return;
    }

    if (user.isAdmin && user.isVip && user.credits >= 9999) {
      return;
    }

    await db
      .update(usersTable)
      .set({ isAdmin: true, isVip: true, credits: 9999 })
      .where(eq(usersTable.phone, ADMIN_PHONE));

    logger.info({ phone: ADMIN_PHONE, userId: user.id }, "Admin kullanicisi guncellendi");
  } catch (err) {
    logger.error({ err }, "Admin seed hatasi");
  }
}
