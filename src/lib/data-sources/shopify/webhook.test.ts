import { describe, it, expect } from "vitest";
import { signWebhook, verifyHmac, isKnownTopic } from "./webhook";
import { webhookOrderSchema } from "./webhook-schemas";
import { mapWebhookOrder } from "./webhook-mapper";

const SECRET = "test-secret";

describe("verifyHmac", () => {
  it("valida uma assinatura correta", () => {
    const body = JSON.stringify({ id: 1, foo: "bar" });
    const sig = signWebhook(body, SECRET);
    expect(verifyHmac(body, sig, SECRET)).toBe(true);
  });

  it("rejeita assinatura incorreta", () => {
    const body = JSON.stringify({ id: 1 });
    expect(verifyHmac(body, "assinatura-errada", SECRET)).toBe(false);
    expect(verifyHmac(body, null, SECRET)).toBe(false);
  });

  it("rejeita quando o corpo é adulterado", () => {
    const sig = signWebhook(JSON.stringify({ id: 1 }), SECRET);
    expect(verifyHmac(JSON.stringify({ id: 2 }), sig, SECRET)).toBe(false);
  });
});

describe("isKnownTopic", () => {
  it("reconhece os tópicos tratados", () => {
    expect(isKnownTopic("orders/create")).toBe(true);
    expect(isKnownTopic("refunds/create")).toBe(true);
    expect(isKnownTopic("products/update")).toBe(false);
    expect(isKnownTopic(null)).toBe(false);
  });
});

function order(overrides: Record<string, unknown> = {}) {
  return webhookOrderSchema.parse({
    id: 99001,
    created_at: "2026-08-10T21:00:00Z",
    updated_at: "2026-08-10T21:05:00Z",
    financial_status: "paid",
    total_price: "259.80",
    currency: "BRL",
    landing_site: null,
    referring_site: null,
    source_name: "web",
    note_attributes: [],
    customer: { id: 7, first_name: "Ana", last_name: "Lima", email: "ana@x.com", orders_count: 1 },
    line_items: [{ id: 1, title: "Boné", quantity: 2, price: "129.90", product_id: 42 }],
    ...overrides,
  });
}

describe("mapWebhookOrder", () => {
  it("converte total e itens para centavos", () => {
    const { order: o, externalId } = mapWebhookOrder(order());
    expect(o.total).toBe(25980);
    expect(o.items[0]!.unitPrice).toBe(12990);
    expect(o.itemsCount).toBe(2);
    expect(externalId).toBe("99001");
  });

  it("extrai UTM do landing_site e classifica", () => {
    const { order: o } = mapWebhookOrder(
      order({ landing_site: "/?utm_source=google&utm_medium=cpc&utm_campaign=marca" }),
    );
    expect(o.attribution.utmSource).toBe("google");
    expect(o.attribution.channelGroup).toBe("paid_search");
  });

  it("cai para note_attributes quando o landing não tem UTM", () => {
    const { order: o } = mapWebhookOrder(
      order({
        landing_site: "/produtos",
        note_attributes: [
          { name: "utm_source", value: "instagram" },
          { name: "utm_medium", value: "paid_social" },
        ],
      }),
    );
    expect(o.attribution.channelGroup).toBe("paid_social");
  });

  it("detecta POS via source_name", () => {
    const { order: o } = mapWebhookOrder(order({ source_name: "pos" }));
    expect(o.channel).toBe("fisica");
    expect(o.attribution.channelGroup).toBe("loja_fisica");
  });

  it("marca refunded quando cancelado", () => {
    const { order: o } = mapWebhookOrder(order(), { cancelled: true });
    expect(o.financialStatus).toBe("refunded");
  });
});
