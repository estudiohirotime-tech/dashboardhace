// Configuração da fonte Shopify (leitura de env + modo fixture fictício).

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  apiVersion: string;
  webhookSecret?: string;
  /** true = payloads fictícios locais (sem rede), para demonstração. */
  fixture: boolean;
}

function truthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

/**
 * Lê a configuração da Shopify.
 * - Se SHOPIFY_FIXTURE=1, ativa o modo fictício (não exige credenciais reais):
 *   a fonte fica "conectada" e alimenta o pipeline real com dados fictícios.
 * - Caso contrário, exige domínio + token para a Admin API real.
 * - Sem nada disso, retorna null (o registry cai no mock).
 */
export function readShopifyConfig(): ShopifyConfig | null {
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2025-01";

  if (truthy(process.env.SHOPIFY_FIXTURE)) {
    return {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN || "loja-ficticia.myshopify.com",
      accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "shpat_fixture",
      apiVersion,
      webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || "fixture-secret",
      fixture: true,
    };
  }

  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!storeDomain || !accessToken) return null;

  return {
    storeDomain,
    accessToken,
    apiVersion,
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
    fixture: false,
  };
}
