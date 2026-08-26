import { describe, it, expect } from "vitest";
import { orderNodeSchema } from "./schemas";
import { mapShopifyOrder, gidToId } from "./order-mapper";

function makeNode(overrides: Record<string, unknown> = {}) {
  const base = {
    id: "gid://shopify/Order/1001",
    name: "#1001",
    createdAt: "2026-08-01T20:30:00Z",
    updatedAt: "2026-08-01T20:30:00Z",
    displayFinancialStatus: "PAID",
    currentTotalPriceSet: { shopMoney: { amount: "199.90", currencyCode: "BRL" } },
    landingPageUrl: null,
    referrerUrl: null,
    note: null,
    customAttributes: [],
    customerJourneySummary: null,
    customer: {
      id: "gid://shopify/Customer/55",
      firstName: "Ana",
      lastName: "Silva",
      email: "ana@example.com",
      numberOfOrders: 1,
    },
    app: { name: "Online Store" },
    lineItems: {
      edges: [
        {
          node: {
            id: "gid://shopify/LineItem/1",
            title: "Tênis Corrida",
            quantity: 2,
            product: { id: "gid://shopify/Product/9" },
            originalUnitPriceSet: { shopMoney: { amount: "99.95", currencyCode: "BRL" } },
            originalTotalSet: { shopMoney: { amount: "199.90", currencyCode: "BRL" } },
          },
        },
      ],
    },
    ...overrides,
  };
  return orderNodeSchema.parse(base);
}

describe("mapShopifyOrder", () => {
  it("converte total e itens para centavos", () => {
    const { order } = mapShopifyOrder(makeNode());
    expect(order.total).toBe(19990);
    expect(order.items[0]!.unitPrice).toBe(9995);
    expect(order.items[0]!.total).toBe(19990);
    expect(order.itemsCount).toBe(2);
    expect(order.currency).toBe("BRL");
  });

  it("extrai UTM da query do landingPageUrl e classifica paid_social", () => {
    const { order } = mapShopifyOrder(
      makeNode({
        landingPageUrl:
          "https://loja.com.br/?utm_source=instagram&utm_medium=paid_social&utm_campaign=verao-2026",
        referrerUrl: "https://l.instagram.com/",
      }),
    );
    expect(order.attribution.utmSource).toBe("instagram");
    expect(order.attribution.utmCampaign).toBe("verao-2026");
    expect(order.attribution.channelGroup).toBe("paid_social");
  });

  it("cai para customAttributes quando o landing não tem UTM", () => {
    const { order } = mapShopifyOrder(
      makeNode({
        landingPageUrl: "https://loja.com.br/produtos",
        customAttributes: [
          { key: "utm_source", value: "google" },
          { key: "utm_medium", value: "cpc" },
          { key: "utm_campaign", value: "search-marca" },
        ],
      }),
    );
    expect(order.attribution.utmSource).toBe("google");
    expect(order.attribution.channelGroup).toBe("paid_search");
  });

  it("usa utmParameters da jornada quando landing e attrs estão vazios", () => {
    const visit = {
      occurredAt: "2026-07-30T10:00:00Z",
      landingPage: null,
      referrerUrl: null,
      source: "rd-station",
      sourceType: "utm",
      utmParameters: { source: "rd-station", medium: "email", campaign: "boas-vindas", content: null, term: null },
    };
    const { order, lastClickOnly } = mapShopifyOrder(
      makeNode({
        customerJourneySummary: { ready: true, momentsCount: 3, firstVisit: visit, lastVisit: visit },
      }),
    );
    expect(order.attribution.channelGroup).toBe("email");
    expect(order.attribution.firstTouch).not.toBeNull();
    expect(order.attribution.lastTouch).not.toBeNull();
    expect(lastClickOnly).toBe(false);
  });

  it("degrada para último clique quando a jornada não está disponível", () => {
    const { order, lastClickOnly } = mapShopifyOrder(
      makeNode({ customerJourneySummary: { ready: false, momentsCount: null, firstVisit: null, lastVisit: null } }),
    );
    expect(order.attribution.firstTouch).toBeNull();
    expect(order.attribution.lastTouch).toBeNull();
    expect(lastClickOnly).toBe(true);
  });

  it("detecta POS e marca canal físico / loja_fisica", () => {
    const { order } = mapShopifyOrder(makeNode({ app: { name: "Point of Sale" } }));
    expect(order.channel).toBe("fisica");
    expect(order.attribution.channelGroup).toBe("loja_fisica");
  });

  it("mapeia status financeiro", () => {
    expect(mapShopifyOrder(makeNode({ displayFinancialStatus: "REFUNDED" })).order.financialStatus).toBe("refunded");
    expect(
      mapShopifyOrder(makeNode({ displayFinancialStatus: "PARTIALLY_REFUNDED" })).order.financialStatus,
    ).toBe("partially_refunded");
    expect(mapShopifyOrder(makeNode({ displayFinancialStatus: "PENDING" })).order.financialStatus).toBe("pending");
  });

  it("marca cliente recorrente quando numberOfOrders > 1", () => {
    const { order } = mapShopifyOrder(
      makeNode({
        customer: { id: "gid://shopify/Customer/7", firstName: "Rafael", lastName: "Souza", email: "r@x.com", numberOfOrders: 4 },
      }),
    );
    expect(order.customer.isReturning).toBe(true);
    expect(order.customer.name).toBe("Rafael Souza");
  });

  it("sem referrer e sem UTM classifica como direct", () => {
    const { order } = mapShopifyOrder(makeNode({ landingPageUrl: "https://loja.com.br/", referrerUrl: null }));
    expect(order.attribution.channelGroup).toBe("direct");
  });
});

describe("gidToId", () => {
  it("extrai o id numérico do GID", () => {
    expect(gidToId("gid://shopify/Order/123")).toBe("123");
    expect(gidToId(null)).toBe("");
  });
});
