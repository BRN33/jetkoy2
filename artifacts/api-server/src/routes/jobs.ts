import { Router, type IRouter } from "express";
import { db, usersTable, jobsTable, commissionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateJobBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  return phone.slice(0, 3) + "***" + phone.slice(-2);
}

function formatJob(job: {
  id: number;
  creatorId: number;
  departure: string;
  destination: string;
  passengerName: string;
  passengerPhone: string;
  totalFare: string;
  commission: string;
  status: string;
  grabbedById: number | null;
  createdAt: Date;
}, creator: { fullName: string; plate: string }, masked = true) {
  return {
    id: String(job.id),
    creatorId: String(job.creatorId),
    creatorName: creator.fullName,
    creatorPlate: creator.plate,
    departure: job.departure,
    destination: job.destination,
    passengerName: job.passengerName,
    passengerPhoneMasked: masked ? maskPhone(job.passengerPhone) : job.passengerPhone,
    totalFare: parseFloat(job.totalFare),
    commission: parseFloat(job.commission),
    status: job.status as "available" | "grabbed",
    createdAt: job.createdAt.toISOString(),
  };
}

router.get("/jobs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  const jobs = await db
    .select({
      job: jobsTable,
      creator: { fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(jobsTable.creatorId, usersTable.id))
    .where(eq(jobsTable.status, "available"));

  const now = Date.now();
  const filteredJobs = currentUser?.isVip
    ? jobs
    : jobs.filter((j) => now - j.job.createdAt.getTime() >= 10000);

  res.json(filteredJobs.map((j) => formatJob(j.job, j.creator, true)));
});

router.post("/jobs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { departure, destination, passengerName, passengerPhone, totalFare, commission } = parsed.data;

  const [job] = await db
    .insert(jobsTable)
    .values({
      creatorId: req.userId!,
      departure,
      destination,
      passengerName,
      passengerPhone,
      totalFare: String(totalFare),
      commission: String(commission),
      status: "available",
    })
    .returning();

  if (!job) {
    res.status(500).json({ error: "Internal error", message: "İş oluşturulamadı" });
    return;
  }

  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json(formatJob(job, { fullName: creator?.fullName ?? "", plate: creator?.plate ?? "" }, true));
});

router.get("/jobs/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const createdJobsRaw = await db
    .select({
      job: jobsTable,
      creator: { fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(jobsTable.creatorId, usersTable.id))
    .where(eq(jobsTable.creatorId, req.userId!));

  const grabbedJobsRaw = await db
    .select({
      job: jobsTable,
      creator: { fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(jobsTable.creatorId, usersTable.id))
    .where(eq(jobsTable.grabbedById, req.userId!));

  res.json({
    createdJobs: createdJobsRaw.map((j) => formatJob(j.job, j.creator, true)),
    grabbedJobs: grabbedJobsRaw.map((j) => formatJob(j.job, j.creator, true)),
  });
});

router.get("/jobs/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz iş ID" });
    return;
  }

  const [row] = await db
    .select({
      job: jobsTable,
      creator: { fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(jobsTable.creatorId, usersTable.id))
    .where(eq(jobsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Not found", message: "İş bulunamadı" });
    return;
  }

  const isOwner = row.job.creatorId === req.userId || row.job.grabbedById === req.userId;

  res.json({
    id: String(row.job.id),
    creatorId: String(row.job.creatorId),
    creatorName: row.creator.fullName,
    creatorPlate: row.creator.plate,
    departure: row.job.departure,
    destination: row.job.destination,
    passengerName: row.job.passengerName,
    passengerPhone: isOwner ? row.job.passengerPhone : maskPhone(row.job.passengerPhone),
    totalFare: parseFloat(row.job.totalFare),
    commission: parseFloat(row.job.commission),
    status: row.job.status as "available" | "grabbed",
    grabbedById: row.job.grabbedById ? String(row.job.grabbedById) : null,
    createdAt: row.job.createdAt.toISOString(),
  });
});

router.post("/jobs/:id/grab", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz iş ID" });
    return;
  }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!currentUser) {
    res.status(401).json({ error: "Unauthorized", message: "Kullanıcı bulunamadı" });
    return;
  }

  if (currentUser.credits < 5) {
    res.status(400).json({ error: "Insufficient credits", message: "Bakiyeniz yetersiz. Lütfen kredi yükleyin." });
    return;
  }

  const [row] = await db
    .select({
      job: jobsTable,
      creator: { id: usersTable.id, fullName: usersTable.fullName, plate: usersTable.plate },
    })
    .from(jobsTable)
    .innerJoin(usersTable, eq(jobsTable.creatorId, usersTable.id))
    .where(and(eq(jobsTable.id, id), eq(jobsTable.status, "available")));

  if (!row) {
    res.status(400).json({ error: "Already taken", message: "Bu iş zaten kapıldı veya mevcut değil" });
    return;
  }

  if (row.job.creatorId === req.userId) {
    res.status(400).json({ error: "Cannot grab own job", message: "Kendi işinizi kaptamazsınız" });
    return;
  }

  await db
    .update(jobsTable)
    .set({ status: "grabbed", grabbedById: req.userId! })
    .where(eq(jobsTable.id, id));

  await db
    .update(usersTable)
    .set({ credits: currentUser.credits - 5 })
    .where(eq(usersTable.id, req.userId!));

  const commission = parseFloat(row.job.commission);
  if (commission > 0) {
    await db.insert(commissionsTable).values({
      jobId: id,
      creatorId: row.job.creatorId,
      grabberId: req.userId!,
      amount: String(commission),
      status: "pending",
    });
  }

  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  const updatedJob = {
    ...row.job,
    status: "grabbed",
    grabbedById: req.userId!,
  };

  res.json({
    job: {
      id: String(updatedJob.id),
      creatorId: String(updatedJob.creatorId),
      creatorName: row.creator.fullName,
      creatorPlate: row.creator.plate,
      departure: updatedJob.departure,
      destination: updatedJob.destination,
      passengerName: updatedJob.passengerName,
      passengerPhone: updatedJob.passengerPhone,
      totalFare: parseFloat(updatedJob.totalFare),
      commission: parseFloat(updatedJob.commission),
      status: "grabbed",
      grabbedById: String(req.userId),
      createdAt: updatedJob.createdAt.toISOString(),
    },
    passengerPhone: row.job.passengerPhone,
    newCreditBalance: updatedUser?.credits ?? currentUser.credits - 5,
  });
});

export default router;
