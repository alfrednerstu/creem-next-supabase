import crypto from "node:crypto";
import { env } from "@/lib/env";

export type CreemEventType =
  | "checkout.completed"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.renewed"
  | "subscription.canceled"
  | "subscription.paused"
  | "subscription.resumed"
  | "payment.succeeded"
  | "payment.failed"
  | (string & {});

export interface CreemWebhookEvent {
  id: string;
  type: CreemEventType;
  created?: string;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Verifies a Creem webhook signature using HMAC-SHA256 over the raw body.
 * Creem sends the signature in the `creem-signature` header.
 *
 * Uses a timing-safe comparison so signature mismatches don't leak through
 * response-time side channels.
 */
export function verifyCreemSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = env.creemWebhookSecret();
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const received = Buffer.from(signatureHeader, "utf8");
  const computed = Buffer.from(expected, "utf8");
  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}

export function parseCreemEvent(rawBody: string): CreemWebhookEvent {
  return JSON.parse(rawBody) as CreemWebhookEvent;
}
