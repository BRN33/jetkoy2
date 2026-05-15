import { Router, type IRouter } from "express";
import { db, usersTable, jobsTable, commissionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/wallet", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Kullanıcı bulunamadı" });
    return;
  }

  const earnedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${commissionsTable.amount}), 0)` })
    .from(commissionsTable)
    .where(eq(commissionsTable.creatorId, req.userId!));

  const spentResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${commissionsTable.amount}), 0)` })
    .from(commissionsTable)
    .where(eq(commissionsTable.grabberId, req.userId!));

  res.json({
    credits: user.credits,
    totalEarned: parseFloat(earnedResult[0]?.total ?? "0"),
    totalSpent: parseFloat(spentResult[0]?.total ?? "0"),
  });
});

router.get("/wallet/commissions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const receivableRaw = await db
    .select({
      commission: commissionsTable,
      job: { departure: jobsTable.departure, destination: jobsTable.destination },
      grabber: { fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(commissionsTable)
    .innerJoin(jobsTable, eq(commissionsTable.jobId, jobsTable.id))
    .innerJoin(usersTable, eq(commissionsTable.grabberId, usersTable.id))
    .where(eq(commissionsTable.creatorId, req.userId!));

  const payableRaw = await db
    .select({
      commission: commissionsTable,
      job: { departure: jobsTable.departure, destination: jobsTable.destination },
      creator: { fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(commissionsTable)
    .innerJoin(jobsTable, eq(commissionsTable.jobId, jobsTable.id))
    .innerJoin(usersTable, eq(commissionsTable.creatorId, usersTable.id))
    .where(and(eq(commissionsTable.grabberId, req.userId!)));

  res.json({
    receivable: receivableRaw.map((r) => ({
      id: String(r.commission.id),
      jobId: String(r.commission.jobId),
      departure: r.job.departure,
      destination: r.job.destination,
      amount: parseFloat(r.commission.amount),
      driverName: r.grabber.fullName,
      driverPlate: r.grabber.plate,
      status: r.commission.status as "pending" | "paid",
      createdAt: r.commission.createdAt.toISOString(),
    })),
    payable: payableRaw.map((r) => ({
      id: String(r.commission.id),
      jobId: String(r.commission.jobId),
      departure: r.job.departure,
      destination: r.job.destination,
      amount: parseFloat(r.commission.amount),
      driverName: r.creator.fullName,
      driverPlate: r.creator.plate,
      status: r.commission.status as "pending" | "paid",
      createdAt: r.commission.createdAt.toISOString(),
    })),
  });
});

export default router;
