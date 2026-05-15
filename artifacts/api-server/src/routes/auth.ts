import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { requireAuth, signToken, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

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
    .values({ fullName, phone, plate, passwordHash, credits: 0, isVip: false, isAdmin: false })
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
  });
});

export default router;
