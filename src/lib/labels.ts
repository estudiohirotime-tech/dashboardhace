import type { ChannelGroup, Channel, FinancialStatus } from "./data-sources/types";

export const CHANNEL_GROUP_LABELS: Record<ChannelGroup, string> = {
  paid_social: "Social pago",
  paid_search: "Busca paga",
  organic_search: "Busca orgânica",
  organic_social: "Social orgânico",
  email: "E-mail",
  direct: "Direto",
  referral: "Referência",
  influencer: "Influenciador",
  loja_fisica: "Loja física",
  unknown: "Desconhecido",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  online: "Loja online",
  fisica: "Loja física",
};

export const FINANCIAL_LABELS: Record<FinancialStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  refunded: "Reembolsado",
  partially_refunded: "Reembolso parcial",
};

// Cor estável por grupo de canal (usa a escala azul→ciano dos tokens).
export const CHANNEL_GROUP_COLORS: Record<ChannelGroup, string> = {
  paid_social: "var(--series-1)",
  organic_social: "var(--series-2)",
  paid_search: "var(--series-3)",
  organic_search: "var(--series-4)",
  email: "var(--series-5)",
  direct: "var(--series-6)",
  referral: "#38bdf8",
  influencer: "#818cf8",
  loja_fisica: "#22d3ee",
  unknown: "#64748b",
};

export function channelGroupLabel(g: ChannelGroup): string {
  return CHANNEL_GROUP_LABELS[g] ?? g;
}
