import { describe, it, expect } from "vitest";
import { effectiveAttribution, attributionBreakdown } from "./aggregations";
import type { Order, TouchPoint } from "./types";

function touch(partial: Partial<TouchPoint>): TouchPoint {
  return {
    occurredAt: "2026-08-01T10:00:00Z",
    source: null,
    medium: null,
    campaign: null,
    landingPage: null,
    referrer: null,
    channelGroup: "direct",
    ...partial,
  };
}

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    channel: "online",
    sourceSystem: "shopify",
    createdAt: "2026-08-05T20:00:00Z",
    total: 20000,
    currency: "BRL",
    itemsCount: 1,
    customer: { id: "c1", name: "Ana", email: null, isReturning: false },
    attribution: {
      utmSource: "rd-station",
      utmMedium: "email",
      utmCampaign: "boas-vindas",
      utmContent: null,
      utmTerm: null,
      landingPage: null,
      referrer: null,
      channelGroup: "email",
      firstTouch: touch({ channelGroup: "paid_social", source: "instagram", campaign: "verao-2026" }),
      lastTouch: touch({ channelGroup: "email", source: "rd-station", campaign: "boas-vindas" }),
    },
    items: [{ id: "i1", productId: "p1", title: "X", quantity: 1, unitPrice: 20000, total: 20000 }],
    financialStatus: "paid",
    ...overrides,
  };
}

describe("effectiveAttribution", () => {
  it("último clique usa a atribuição resolvida do pedido", () => {
    expect(effectiveAttribution(order(), "last_click").channelGroup).toBe("email");
    expect(effectiveAttribution(order(), "last_click").utmCampaign).toBe("boas-vindas");
  });

  it("primeiro clique usa o firstTouch", () => {
    expect(effectiveAttribution(order(), "first_click").channelGroup).toBe("paid_social");
    expect(effectiveAttribution(order(), "first_click").utmCampaign).toBe("verao-2026");
  });

  it("primeiro clique cai para último quando não há firstTouch", () => {
    const o = order();
    o.attribution.firstTouch = null;
    expect(effectiveAttribution(o, "first_click").channelGroup).toBe("email");
  });
});

describe("attributionBreakdown por modelo", () => {
  it("credita canais diferentes conforme o modelo", () => {
    const orders = [order(), order({ id: "o2" })];
    const last = attributionBreakdown(orders, "last_click");
    const first = attributionBreakdown(orders, "first_click");
    expect(last[0]!.channelGroup).toBe("email");
    expect(first[0]!.channelGroup).toBe("paid_social");
  });
});
