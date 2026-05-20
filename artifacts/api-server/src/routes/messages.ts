import { Router, type IRouter } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { eq, desc, or, isNull } from "drizzle-orm";
import { SendMessageBody, AdminReplyMessageBody, AdminSendMessageBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        eq(messagesTable.senderId, userId),
        eq(messagesTable.recipientId, userId)
      )
    )
    .orderBy(desc(messagesTable.createdAt));

  res.json(
    msgs.map((m) => ({
      id: String(m.id),
      content: m.content,
      isRead: m.isRead,
      adminReply: m.adminReply ?? null,
      repliedAt: m.repliedAt ? m.repliedAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      fromAdmin: m.recipientId === userId,
    }))
  );
});

router.post("/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ senderId: req.userId!, content: parsed.data.content })
    .returning();

  if (!msg) {
    res.status(500).json({ error: "Internal error", message: "Mesaj gönderilemedi" });
    return;
  }

  res.status(201).json({
    id: String(msg.id),
    content: msg.content,
    isRead: msg.isRead,
    adminReply: msg.adminReply ?? null,
    repliedAt: msg.repliedAt ? msg.repliedAt.toISOString() : null,
    createdAt: msg.createdAt.toISOString(),
    fromAdmin: false,
  });
});

router.get("/admin/messages", requireAdmin, async (_req, res): Promise<void> => {
  const msgs = await db
    .select({
      msg: messagesTable,
      sender: {
        fullName: usersTable.fullName,
        phone: usersTable.phone,
        plate: usersTable.plate,
      },
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(isNull(messagesTable.recipientId))
    .orderBy(desc(messagesTable.createdAt));

  res.json(
    msgs.map((m) => ({
      id: String(m.msg.id),
      senderId: String(m.msg.senderId),
      senderName: m.sender.fullName,
      senderPhone: m.sender.phone,
      senderPlate: m.sender.plate,
      content: m.msg.content,
      isRead: m.msg.isRead,
      adminReply: m.msg.adminReply ?? null,
      repliedAt: m.msg.repliedAt ? m.msg.repliedAt.toISOString() : null,
      createdAt: m.msg.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/messages/send", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AdminSendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const recipientId = parseInt(parsed.data.userId, 10);
  if (isNaN(recipientId)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz kullanıcı ID" });
    return;
  }

  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId));
  if (!recipient) {
    res.status(404).json({ error: "Not found", message: "Kullanıcı bulunamadı" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ senderId: req.userId!, recipientId, content: parsed.data.content })
    .returning();

  if (!msg) {
    res.status(500).json({ error: "Internal error", message: "Mesaj gönderilemedi" });
    return;
  }

  const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    id: String(msg.id),
    senderId: String(msg.senderId),
    senderName: adminUser?.fullName ?? "Admin",
    senderPhone: adminUser?.phone ?? "",
    senderPlate: adminUser?.plate ?? "",
    content: msg.content,
    isRead: msg.isRead,
    adminReply: msg.adminReply ?? null,
    repliedAt: msg.repliedAt ? msg.repliedAt.toISOString() : null,
    createdAt: msg.createdAt.toISOString(),
  });
});

router.post("/admin/messages/:id/reply", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz mesaj ID" });
    return;
  }

  const parsed = AdminReplyMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Mesaj bulunamadı" });
    return;
  }

  const [updated] = await db
    .update(messagesTable)
    .set({ adminReply: parsed.data.reply, isRead: true, repliedAt: new Date() })
    .where(eq(messagesTable.id, id))
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, existing.senderId));

  res.json({
    id: String(updated!.id),
    senderId: String(updated!.senderId),
    senderName: sender?.fullName ?? "",
    senderPhone: sender?.phone ?? "",
    senderPlate: sender?.plate ?? "",
    content: updated!.content,
    isRead: updated!.isRead,
    adminReply: updated!.adminReply ?? null,
    repliedAt: updated!.repliedAt ? updated!.repliedAt.toISOString() : null,
    createdAt: updated!.createdAt.toISOString(),
  });
});

export default router;
