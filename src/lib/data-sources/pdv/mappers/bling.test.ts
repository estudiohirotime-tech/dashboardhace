import { describe, it, expect } from "vitest";
import { blingSaleSchema, mapBlingSale } from "./bling";

function sale(overrides: Record<string, unknown> = {}) {
  return blingSaleSchema.parse({
    id: 5001,
    numero: 5001,
    data: "2026-08-10",
    total: 349.7,
    situacaoNome: "Atendido",
    contato: { id: 12, nome: "Marina Souza", email: "marina@email.com" },
    loja: { id: 1, nome: "Loja Centro" },
    vendedor: { id: 3, nome: "Rodrigo" },
    formaPagamento: { id: 2, nome: "Pix" },
    cupom: null,
    itens: [{ descricao: "Tênis Corrida", quantidade: 1, valor: 349.7, produto: { id: "1" } }],
    ...overrides,
  });
}

describe("mapBlingSale", () => {
  it("converte total e itens para centavos", () => {
    const { order, externalId } = mapBlingSale(sale());
    expect(order.total).toBe(34970);
    expect(order.items[0]!.unitPrice).toBe(34970);
    expect(order.itemsCount).toBe(1);
    expect(externalId).toBe("5001");
  });

  it("converte a data yyyy-MM-dd para ISO", () => {
    const { order } = mapBlingSale(sale());
    expect(order.createdAt).toBe(new Date("2026-08-10T15:00:00-03:00").toISOString());
  });

  it("classifica sempre como loja_fisica e canal fisica", () => {
    const { order } = mapBlingSale(sale());
    expect(order.channel).toBe("fisica");
    expect(order.attribution.channelGroup).toBe("loja_fisica");
  });

  it("usa o cupom como ponte de atribuição (utmCampaign)", () => {
    const { order } = mapBlingSale(sale({ cupom: "JULIANA_COSTA" }));
    expect(order.attribution.utmCampaign).toBe("juliana_costa");
  });

  it("preserva vendedor, unidade e forma de pagamento", () => {
    const { order } = mapBlingSale(sale());
    expect(order.vendedor).toBe("Rodrigo");
    expect(order.unidade).toBe("Loja Centro");
    expect(order.formaPagamento).toBe("Pix");
  });

  it("mapeia status: Cancelado -> refunded, Em aberto -> pending", () => {
    expect(mapBlingSale(sale({ situacaoNome: "Cancelado" })).order.financialStatus).toBe("refunded");
    expect(mapBlingSale(sale({ situacaoNome: "Em aberto" })).order.financialStatus).toBe("pending");
    expect(mapBlingSale(sale({ situacaoNome: "Atendido" })).order.financialStatus).toBe("paid");
  });

  it("trata venda de balcão sem contato", () => {
    const { order } = mapBlingSale(sale({ contato: null }));
    expect(order.customer.id).toBeNull();
    expect(order.customer.name).toBeNull();
  });
});
