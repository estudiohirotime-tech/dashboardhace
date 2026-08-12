// -----------------------------------------------------------------------------
// Mapper do Bling (ERP) — payload de venda -> Order.
// Isolado por sistema: trocar de ERP = escrever outro mapper, nada mais.
//
// Para a loja física, channelGroup é sempre "loja_fisica", mas preservamos
// vendedor, unidade e formaPagamento (as dimensões de origem no físico).
// Um cupom/código de vendedor serve de PONTE de atribuição com o online:
// é gravado em utmCampaign.
// -----------------------------------------------------------------------------

import { z } from "zod";
import type { Order, OrderItem, FinancialStatus, Attribution } from "../../types";

const nullableString = z.string().nullish().transform((v) => v ?? null);
const num = z.union([z.number(), z.string()]).transform((v) => (typeof v === "string" ? parseFloat(v) || 0 : v));

const contatoSchema = z
  .object({
    id: z.union([z.number(), z.string()]).nullish().transform((v) => (v == null ? null : String(v))),
    nome: nullableString,
    email: nullableString,
  })
  .nullish()
  .transform((v) => v ?? null);

const namedSchema = z
  .object({
    id: z.union([z.number(), z.string()]).nullish(),
    nome: nullableString,
  })
  .nullish()
  .transform((v) => v ?? null);

const itemSchema = z.object({
  descricao: z.string(),
  quantidade: num,
  valor: num,
  produto: z
    .object({ id: z.union([z.number(), z.string()]).nullish().transform((v) => (v == null ? null : String(v))) })
    .nullish()
    .transform((v) => v ?? null),
});

export const blingSaleSchema = z.object({
  id: z.union([z.number(), z.string()]).transform((v) => String(v)),
  numero: z.union([z.number(), z.string()]).nullish().transform((v) => (v == null ? null : String(v))),
  data: z.string(), // "yyyy-MM-dd" — formato de data do Bling
  total: num,
  situacaoNome: nullableString,
  contato: contatoSchema,
  loja: namedSchema,
  vendedor: namedSchema,
  formaPagamento: namedSchema,
  cupom: nullableString,
  itens: z.array(itemSchema).nullish().transform((v) => v ?? []),
});

export type BlingSale = z.infer<typeof blingSaleSchema>;

function mapStatus(situacao: string | null): FinancialStatus {
  switch ((situacao ?? "").toLowerCase()) {
    case "cancelado":
    case "devolvido":
      return "refunded";
    case "em aberto":
    case "pendente":
      return "pending";
    case "atendido":
    case "pago":
    case "concluído":
    case "concluido":
    default:
      return "paid";
  }
}

/** Converte a data do Bling ("yyyy-MM-dd") para ISO (meio da tarde em SP). */
function blingDateToIso(data: string): string {
  // Se já vier com hora, respeita; senão fixa 15:00 -03:00.
  if (data.includes("T")) return new Date(data).toISOString();
  return new Date(`${data}T15:00:00-03:00`).toISOString();
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

export function mapBlingSale(sale: BlingSale): { order: Order; externalId: string; updatedAt: string } {
  const createdAt = blingDateToIso(sale.data);

  const items: OrderItem[] = sale.itens.map((it, i) => {
    const unit = toCents(it.valor);
    return {
      id: `${sale.id}-${i}`,
      productId: it.produto?.id ?? null,
      title: it.descricao,
      quantity: Math.round(it.quantidade),
      unitPrice: unit,
      total: unit * Math.round(it.quantidade),
    };
  });

  const attribution: Attribution = {
    utmSource: null,
    utmMedium: null,
    // Cupom/código como ponte de atribuição online<->físico.
    utmCampaign: sale.cupom ? sale.cupom.toLowerCase() : null,
    utmContent: null,
    utmTerm: null,
    landingPage: null,
    referrer: null,
    channelGroup: "loja_fisica",
    firstTouch: null,
    lastTouch: null,
  };

  const order: Order = {
    id: `pdv-bling-${sale.id}`,
    channel: "fisica",
    sourceSystem: "pdv",
    createdAt,
    total: toCents(sale.total),
    currency: "BRL",
    itemsCount: items.reduce((a, it) => a + it.quantity, 0),
    customer: {
      id: sale.contato?.id ?? null,
      name: sale.contato?.nome ?? null,
      email: sale.contato?.email ?? null,
      isReturning: false,
    },
    attribution,
    items,
    financialStatus: mapStatus(sale.situacaoNome),
    vendedor: sale.vendedor?.nome ?? null,
    unidade: sale.loja?.nome ?? null,
    formaPagamento: sale.formaPagamento?.nome ?? null,
  };

  return { order, externalId: sale.id, updatedAt: createdAt };
}
