import { db, usersTable } from "@workspace/db";
import { ne, isNotNull } from "drizzle-orm";
import type { Logger } from "pino";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendNewJobNotification(
  creatorId: number,
  departure: string,
  destination: string,
  logger: Logger
): Promise<void> {
  const recipients = await db
    .select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(ne(usersTable.id, creatorId));

  const tokens = recipients
    .map((r) => r.pushToken)
    .filter((t): t is string => typeof t === "string" && t.startsWith("ExponentPushToken["));

  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "Yeni is geldi",
    body: `${departure} → ${destination}`,
    data: { type: "new_job" },
  }));

  const CHUNK_SIZE = 100;
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    try {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(chunk),
      });
      if (!resp.ok) {
        logger.warn({ status: resp.status }, "Expo push API error");
      }
    } catch (err) {
      logger.warn({ err }, "Failed to send push notifications");
    }
  }
}
