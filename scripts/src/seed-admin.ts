import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_FULL_NAME = "Mars";
const ADMIN_PHONE = "5388717379";
const ADMIN_PLATE = "ADMIN";
const ADMIN_PASSWORD = "34253425";

async function seedAdmin() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, ADMIN_PHONE));

  if (existing.length > 0) {
    const user = existing[0]!;
    await db
      .update(usersTable)
      .set({ isAdmin: true, fullName: ADMIN_FULL_NAME })
      .where(eq(usersTable.id, user.id));
    console.log(`Admin user updated: ${ADMIN_FULL_NAME} (${ADMIN_PHONE})`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      fullName: ADMIN_FULL_NAME,
      phone: ADMIN_PHONE,
      plate: ADMIN_PLATE,
      passwordHash,
      credits: 9999,
      isVip: true,
      isAdmin: true,
    })
    .returning();

  console.log(`Admin user created: ${user?.fullName} (${user?.phone}), ID: ${user?.id}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
