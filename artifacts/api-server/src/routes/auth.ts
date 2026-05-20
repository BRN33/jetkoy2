import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, phoneVerificationsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody, SendOtpBody, VerifyOtpBody, UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth, signToken, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { phone } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Bu telefon numarası zaten kayıtlı" });
    return;
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(phoneVerificationsTable).values({ phone, code, expiresAt });

  req.log.info({ phone, code }, "OTP code generated");

  res.json({
    message: "Doğrulama kodu gönderildi",
    devCode: code,
  });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { fullName, phone, plate, password, code } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Bu telefon numarası zaten kayıtlı" });
    return;
  }

  const [verification] = await db
    .select()
    .from(phoneVerificationsTable)
    .where(
      and(
        eq(phoneVerificationsTable.phone, phone),
        eq(phoneVerificationsTable.code, code),
        eq(phoneVerificationsTable.used, false),
        gt(phoneVerificationsTable.expiresAt, new Date())
      )
    )
    .orderBy(phoneVerificationsTable.createdAt)
    .limit(1);

  if (!verification) {
    res.status(400).json({ error: "Bad request", message: "Kod hatalı veya süresi dolmuş" });
    return;
  }

  await db
    .update(phoneVerificationsTable)
    .set({ used: true })
    .where(eq(phoneVerificationsTable.id, verification.id));

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ fullName, phone, plate, passwordHash, credits: 50, isVip: false, isAdmin: false })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Internal error", message: "Kullanıcı oluşturulamadı" });
    return;
  }

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: {
      id: String(user.id),
      fullName: user.fullName,
      phone: user.phone,
      plate: user.plate,
      credits: user.credits,
      isVip: user.isVip,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      avatarUrl: user.avatarUrl ?? null,
    },
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { fullName, phone, plate, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Bu telefon numarası zaten kayıtlı" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({ fullName, phone, plate, passwordHash, credits: 50, isVip: false, isAdmin: false })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Internal error", message: "Kullanıcı oluşturulamadı" });
    return;
  }

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: {
      id: String(user.id),
      fullName: user.fullName,
      phone: user.phone,
      plate: user.plate,
      credits: user.credits,
      isVip: user.isVip,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      avatarUrl: user.avatarUrl ?? null,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { phone, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Telefon veya şifre hatalı" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Telefon veya şifre hatalı" });
    return;
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: {
      id: String(user.id),
      fullName: user.fullName,
      phone: user.phone,
      plate: user.plate,
      credits: user.credits,
      isVip: user.isVip,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      avatarUrl: user.avatarUrl ?? null,
    },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Kullanıcı bulunamadı" });
    return;
  }

  res.json({
    id: String(user.id),
    fullName: user.fullName,
    phone: user.phone,
    plate: user.plate,
    credits: user.credits,
    isVip: user.isVip,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    avatarUrl: user.avatarUrl ?? null,
  });
});

router.patch("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Kullanıcı bulunamadı" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (parsed.data.fullName?.trim()) updates.fullName = parsed.data.fullName.trim();
  if (parsed.data.plate?.trim()) updates.plate = parsed.data.plate.trim().toUpperCase();

  if (parsed.data.newPassword?.trim()) {
    if (!parsed.data.currentPassword?.trim()) {
      res.status(400).json({ error: "Bad request", message: "Mevcut şifre gerekli" });
      return;
    }
    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Bad request", message: "Mevcut şifre hatalı" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!updated) {
    res.status(500).json({ error: "Internal error", message: "Güncelleme başarısız" });
    return;
  }

  res.json({
    id: String(updated.id),
    fullName: updated.fullName,
    phone: updated.phone,
    plate: updated.plate,
    credits: updated.credits,
    isVip: updated.isVip,
    isAdmin: updated.isAdmin,
    createdAt: updated.createdAt.toISOString(),
    avatarUrl: updated.avatarUrl ?? null,
  });
});

router.patch("/profile/avatar", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { avatarUrl } = req.body as { avatarUrl?: string };
  if (!avatarUrl || typeof avatarUrl !== "string") {
    res.status(400).json({ error: "Bad request", message: "avatarUrl gerekli" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ avatarUrl })
    .where(eq(usersTable.id, req.userId!))
    .returning();
  if (!updated) {
    res.status(500).json({ error: "Internal error", message: "Guncelleme basarisiz" });
    return;
  }
  res.json({ success: true, avatarUrl: updated.avatarUrl });
});

router.patch("/profile/push-token", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { pushToken } = req.body as { pushToken?: string };
  if (!pushToken || typeof pushToken !== "string") {
    res.status(400).json({ error: "Bad request", message: "pushToken gerekli" });
    return;
  }
  await db.update(usersTable).set({ pushToken }).where(eq(usersTable.id, req.userId!));
  res.json({ success: true });
});

export default router;
