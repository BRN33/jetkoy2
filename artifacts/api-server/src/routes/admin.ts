import { Router, type IRouter } from "express";
import { db, usersTable, jobsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { AdminAddCreditsBody, AdminSetVipBody } from "@workspace/api-zod";
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

export default router;
