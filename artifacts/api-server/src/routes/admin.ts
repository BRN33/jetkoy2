import { Router, type IRouter } from "express";
import { db, usersTable, jobsTable, commissionsTable, messagesTable } from "@workspace/db";
import { eq, sql, or } from "drizzle-orm";
import { AdminAddCreditsBody, AdminSetVipBody, AdminEditUserBody } from "@workspace/api-zod";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select({
      user: usersTable,
      jobsCreated: sql<number>`CAST(COUNT(DISTINCT CASE WHEN ${jobsTable.creatorId} = ${usersTable.id} THEN ${jobsTable.id} END) AS INTEGER)`,
      jobsGrabbed: sql<number>`CAST(COUNT(DISTINCT CASE WHEN ${jobsTable.grabbedById} = ${usersTable.id} THEN ${jobsTable.id} END) AS INTEGER)`,
    })
    .from(usersTable)
    .leftJoin(jobsTable, sql`${jobsTable.creatorId} = ${usersTable.id} OR ${jobsTable.grabbedById} = ${usersTable.id}`)
    .groupBy(usersTable.id);

  res.json(
    users.map((u) => ({
      id: String(u.user.id),
      fullName: u.user.fullName,
      phone: u.user.phone,
      plate: u.user.plate,
      credits: u.user.credits,
      isVip: u.user.isVip,
      isAdmin: u.user.isAdmin,
      jobsCreated: Number(u.jobsCreated),
      jobsGrabbed: Number(u.jobsGrabbed),
      createdAt: u.user.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/users/:id/credits", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz kullanıcı ID" });
    return;
  }

  const parsed = AdminAddCreditsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "Kullanıcı bulunamadı" });
    return;
  }

  const newCredits = user.credits + Math.floor(parsed.data.amount);
  const [updated] = await db
    .update(usersTable)
    .set({ credits: newCredits })
    .where(eq(usersTable.id, id))
    .returning();

  const jobsCreatedResult = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(jobsTable)
    .where(eq(jobsTable.creatorId, id));

  const jobsGrabbedResult = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(jobsTable)
    .where(eq(jobsTable.grabbedById, id));

  res.json({
    id: String(updated!.id),
    fullName: updated!.fullName,
    phone: updated!.phone,
    plate: updated!.plate,
    credits: updated!.credits,
    isVip: updated!.isVip,
    isAdmin: updated!.isAdmin,
    jobsCreated: Number(jobsCreatedResult[0]?.count ?? 0),
    jobsGrabbed: Number(jobsGrabbedResult[0]?.count ?? 0),
    createdAt: updated!.createdAt.toISOString(),
  });
});

router.post("/admin/users/:id/vip", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz kullanıcı ID" });
    return;
  }

  const parsed = AdminSetVipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isVip: parsed.data.isVip })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found", message: "Kullanıcı bulunamadı" });
    return;
  }

  const jobsCreatedResult = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(jobsTable)
    .where(eq(jobsTable.creatorId, id));

  const jobsGrabbedResult = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(jobsTable)
    .where(eq(jobsTable.grabbedById, id));

  res.json({
    id: String(updated.id),
    fullName: updated.fullName,
    phone: updated.phone,
    plate: updated.plate,
    credits: updated.credits,
    isVip: updated.isVip,
    isAdmin: updated.isAdmin,
    jobsCreated: Number(jobsCreatedResult[0]?.count ?? 0),
    jobsGrabbed: Number(jobsGrabbedResult[0]?.count ?? 0),
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/admin/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz kullanıcı ID" });
    return;
  }

  if (id === req.userId) {
    res.status(400).json({ error: "Bad request", message: "Kendinizi silemezsiniz" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "Kullanıcı bulunamadı" });
    return;
  }

  // Delete associated data first
  await db.delete(messagesTable).where(
    or(eq(messagesTable.senderId, id), eq(messagesTable.recipientId, id))
  );
  await db.delete(commissionsTable).where(
    or(eq(commissionsTable.creatorId, id), eq(commissionsTable.grabberId, id))
  );
  await db.delete(usersTable).where(eq(usersTable.id, id));

  res.json({ success: true });
});

router.patch("/admin/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz kullanıcı ID" });
    return;
  }

  const parsed = AdminEditUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.plate !== undefined) updates.plate = parsed.data.plate;
  if (parsed.data.credits !== undefined) updates.credits = Math.floor(parsed.data.credits);
  if (parsed.data.isVip !== undefined) updates.isVip = parsed.data.isVip;
  if (parsed.data.isAdmin !== undefined) updates.isAdmin = parsed.data.isAdmin;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found", message: "Kullanıcı bulunamadı" });
    return;
  }

  const jobsCreatedResult = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(jobsTable)
    .where(eq(jobsTable.creatorId, id));

  const jobsGrabbedResult = await db
    .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(jobsTable)
    .where(eq(jobsTable.grabbedById, id));

  res.json({
    id: String(updated.id),
    fullName: updated.fullName,
    phone: updated.phone,
    plate: updated.plate,
    credits: updated.credits,
    isVip: updated.isVip,
    isAdmin: updated.isAdmin,
    jobsCreated: Number(jobsCreatedResult[0]?.count ?? 0),
    jobsGrabbed: Number(jobsGrabbedResult[0]?.count ?? 0),
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
