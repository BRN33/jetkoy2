import { Router, type IRouter } from "express";
import { db, usersTable, messagesTable } from "@workspace/db";
import { eq, desc, or, isNull, lt, gt, and } from "drizzle-orm";
import { SendMessageBody, AdminReplyMessageBody, AdminSendMessageBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function msgCutoff() {
  return new Date(Date.now() - TWELVE_HOURS_MS);
}

// Scheduled cleanup: delete non-kept messages older than 12h every hour
setInterval(async () => {
  try {
    await db
      .delete(messagesTable)
      .where(and(lt(messagesTable.createdAt, msgCutoff()), eq(messagesTable.adminKeep, false)));
  } catch {
    // silent
  }
}, 60 * 60 * 1000);

function formatAdminMsg(m: typeof messagesTable.$inferSelect, sender: { fullName: string; phone: string; plate: string }) {
  return {
    id: String(m.id),
    senderId: String(m.senderId),
    senderName: sender.fullName,
    senderPhone: sender.phone,
    senderPlate: sender.plate,
    content: m.content,
    isRead: m.isRead,
    adminKeep: m.adminKeep,
    adminReply: m.adminReply ?? null,
    repliedAt: m.repliedAt ? m.repliedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

// GET /messages — user sees only messages < 12h old
router.get("/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const cutoff = msgCutoff();

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        or(
          eq(messagesTable.senderId, userId),
          eq(messagesTable.recipientId, userId)
        ),
        // only show messages newer than 12h
        gt(messagesTable.createdAt, cutoff)
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

// POST /messages — user sends message to admin
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

// GET /admin/messages — admin sees messages < 12h OR adminKeep=true
router.get("/admin/messages", requireAdmin, async (_req, res): Promise<void> => {
  const cutoff = msgCutoff();

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
    .where(
      and(
        isNull(messagesTable.recipientId),
        or(
          eq(messagesTable.adminKeep, true),
          gt(messagesTable.createdAt, cutoff)
        )
      )
    )
    .orderBy(desc(messagesTable.createdAt));

  res.json(msgs.map((m) => formatAdminMsg(m.msg, m.sender)));
});

// POST /admin/messages/send — admin sends message to a user
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

  res.status(201).json(
    formatAdminMsg(msg, {
      fullName: adminUser?.fullName ?? "Admin",
      phone: adminUser?.phone ?? "",
      plate: adminUser?.plate ?? "",
    })
  );
});

// POST /admin/messages/:id/delete — admin deletes a message
router.post("/admin/messages/:id/delete", requireAdmin, async (req, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz mesaj ID" });
    return;
  }

  const [existing] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Mesaj bulunamadı" });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.id, id));

  res.json({ success: true });
});

// POST /admin/messages/:id/keep — toggle adminKeep
router.post("/admin/messages/:id/keep", requireAdmin, async (req, res): Promise<void> => {
  const idRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idRaw ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad request", message: "Geçersiz mesaj ID" });
    return;
  }

  const [existing] = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found", message: "Mesaj bulunamadı" });
    return;
  }

  const [updated] = await db
    .update(messagesTable)
    .set({ adminKeep: !existing.adminKeep })
    .where(eq(messagesTable.id, id))
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, existing.senderId));

  res.json(
    formatAdminMsg(updated!, {
      fullName: sender?.fullName ?? "",
      phone: sender?.phone ?? "",
      plate: sender?.plate ?? "",
    })
  );
});

// POST /admin/messages/:id/reply — admin replies to a message
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

  res.json(
    formatAdminMsg(updated!, {
      fullName: sender?.fullName ?? "",
      phone: sender?.phone ?? "",
      plate: sender?.plate ?? "",
    })
  );
});

export default router;
