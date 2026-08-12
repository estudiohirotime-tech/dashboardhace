// -----------------------------------------------------------------------------
// Fila em processo para webhooks: o endpoint responde 200 rápido e o
// processamento (validação + upsert no banco) acontece de forma sequencial e
// assíncrona, sem bloquear a resposta. Em produção, trocar por uma fila
// externa (SQS/BullMQ) mantendo esta mesma interface.
// -----------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { webhookOrderSchema, webhookRefundSchema } from "./webhook-schemas";
import { mapWebhookOrder } from "./webhook-mapper";
import { upsertOrder } from "./sync";
import { isKnownTopic, type ShopifyWebhookTopic } from "./webhook";

export interface WebhookJob {
  topic: ShopifyWebhookTopic;
  payload: unknown;
  receivedAt: number;
}

export async function processWebhook(job: WebhookJob): Promise<void> {
  switch (job.topic) {
    case "orders/create":
    case "orders/updated":
    case "orders/paid": {
      const payload = webhookOrderSchema.parse(job.payload);
      const { order, externalId, updatedAt } = mapWebhookOrder(payload);
      await upsertOrder(order, externalId, updatedAt);
      break;
    }
    case "orders/cancelled": {
      const payload = webhookOrderSchema.parse(job.payload);
      const { order, externalId, updatedAt } = mapWebhookOrder(payload, { cancelled: true });
      await upsertOrder(order, externalId, updatedAt);
      break;
    }
    case "refunds/create": {
      const refund = webhookRefundSchema.parse(job.payload);
      await prisma.order.updateMany({
        where: { sourceSystem: "shopify", externalId: refund.order_id },
        data: { financialStatus: "partially_refunded", updatedAt: new Date(refund.created_at) },
      });
      break;
    }
  }
}

class WebhookQueue {
  private chain: Promise<void> = Promise.resolve();
  private pending = 0;

  enqueue(job: WebhookJob): void {
    this.pending++;
    this.chain = this.chain
      .then(() => processWebhook(job))
      .catch((err) => {
        console.error(`[webhook] falha ao processar ${job.topic}:`, err);
      })
      .finally(() => {
        this.pending--;
      });
  }

  /** Aguarda a fila drenar (usado em testes/simulador). */
  async flush(): Promise<void> {
    await this.chain;
  }

  get size(): number {
    return this.pending;
  }
}

export const webhookQueue = new WebhookQueue();

export function enqueueWebhook(topic: string, payload: unknown): boolean {
  if (!isKnownTopic(topic)) return false;
  webhookQueue.enqueue({ topic, payload, receivedAt: Date.now() });
  return true;
}
