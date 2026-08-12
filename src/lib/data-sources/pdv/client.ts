// -----------------------------------------------------------------------------
// Cliente de transporte do PDV/ERP. Agnóstico de sistema: entrega vendas
// "cruas" (o mapper por sistema cuida do shape). Autenticação por tipo.
// Modo fixture: responde localmente sem rede.
// -----------------------------------------------------------------------------

import type { PdvConfig } from "./config";
import { getPdvFixturePage, type PdvFixturePage } from "./fixture";

export interface FetchSalesParams {
  page: number;
  updatedAtMin?: string | null;
}

export class PdvClient {
  constructor(private readonly config: PdvConfig) {}

  private authHeaders(): Record<string, string> {
    const { authType, apiKey, apiSecret } = this.config;
    switch (authType) {
      case "basic":
        return { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret ?? ""}`).toString("base64")}` };
      case "apikey_header":
        return { "X-Api-Key": apiKey };
      case "oauth2":
      case "bearer":
      default:
        return { Authorization: `Bearer ${apiKey}` };
    }
  }

  async fetchSalesPage(params: FetchSalesParams): Promise<PdvFixturePage> {
    if (this.config.fixture) {
      return getPdvFixturePage(params.page, params.updatedAtMin);
    }

    // Modo real (transporte genérico). O caminho/paginação é específico do ERP;
    // aqui usamos o padrão do Bling v3 (?pagina=). Ajustar por sistema quando
    // conectar uma conta real.
    const url = new URL(`${this.config.baseUrl.replace(/\/$/, "")}/pedidos/vendas`);
    url.searchParams.set("pagina", String(params.page));
    if (params.updatedAtMin) url.searchParams.set("dataAlteracao", params.updatedAtMin.slice(0, 10));
    if (this.config.storeId) url.searchParams.set("idLoja", this.config.storeId);

    const res = await fetch(url.toString(), { headers: { Accept: "application/json", ...this.authHeaders() } });
    if (!res.ok) throw new Error(`PDV HTTP ${res.status}`);
    const json = (await res.json()) as { data?: unknown[] };
    const sales = Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [];
    return { sales, hasNext: sales.length > 0 };
  }

  async ping(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.fetchSalesPage({ page: 1 });
      return { ok: true, message: "PDV conectado." };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }
}
