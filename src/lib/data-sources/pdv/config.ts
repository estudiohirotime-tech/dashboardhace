// Configuração da fonte PDV/ERP (loja física) + modo fixture fictício.

export type PdvSystem = "bling" | "tiny" | "omie" | "linx" | "totvs" | "shopify_pos" | "custom";
export type PdvAuthType = "bearer" | "apikey_header" | "oauth2" | "basic";

export interface PdvConfig {
  system: PdvSystem;
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  authType: PdvAuthType;
  storeId?: string;
  /** true = payloads fictícios locais (sem rede), para demonstração. */
  fixture: boolean;
}

function truthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

/**
 * Lê a configuração do PDV.
 * - PDV_FIXTURE=1 ativa o modo fictício (default: sistema "bling"): a loja
 *   física fica "conectada" e alimenta o pipeline real com vendas fictícias.
 * - Caso contrário, exige system + baseUrl + apiKey para a API real.
 * - Sem isso, retorna null (o registry cai no mock).
 */
export function readPdvConfig(): PdvConfig | null {
  const system = (process.env.PDV_SYSTEM as PdvSystem | undefined) ?? undefined;
  const authType = (process.env.PDV_AUTH_TYPE as PdvAuthType | undefined) ?? "bearer";

  if (truthy(process.env.PDV_FIXTURE)) {
    return {
      system: system ?? "bling",
      baseUrl: process.env.PDV_API_BASE_URL || "https://api.bling.com.br/Api/v3",
      apiKey: process.env.PDV_API_KEY || "pdv_fixture",
      apiSecret: process.env.PDV_API_SECRET,
      authType,
      storeId: process.env.PDV_STORE_ID,
      fixture: true,
    };
  }

  const baseUrl = process.env.PDV_API_BASE_URL;
  const apiKey = process.env.PDV_API_KEY;
  if (!system || !baseUrl || !apiKey) return null;

  return {
    system,
    baseUrl,
    apiKey,
    apiSecret: process.env.PDV_API_SECRET,
    authType,
    storeId: process.env.PDV_STORE_ID,
    fixture: false,
  };
}
