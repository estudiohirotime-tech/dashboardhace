// -----------------------------------------------------------------------------
// PdvDataSource — STUB (Fase 1).
// A implementação real (com mapeador isolado por sistema em pdv/mappers/) chega
// na Fase 5, depois que o sistema da loja física for definido. Por ora o
// healthCheck reporta "não configurado/implementado" e o registry cai no mock
// da loja física, de forma independente da loja online.
// -----------------------------------------------------------------------------

import type {
  DataSource,
  DateRange,
  OrderFilters,
  Order,
  FunnelSnapshot,
  AttributionRow,
  ProductRow,
  HealthCheckResult,
  Channel,
} from "../types";

export type PdvSystem =
  | "bling"
  | "tiny"
  | "omie"
  | "linx"
  | "totvs"
  | "shopify_pos"
  | "custom";

export type PdvAuthType = "bearer" | "apikey_header" | "oauth2" | "basic";

export interface PdvConfig {
  system: PdvSystem;
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  authType: PdvAuthType;
  storeId?: string;
}

export function readPdvConfig(): PdvConfig | null {
  const system = process.env.PDV_SYSTEM as PdvSystem | undefined;
  const baseUrl = process.env.PDV_API_BASE_URL;
  const apiKey = process.env.PDV_API_KEY;
  const authType = (process.env.PDV_AUTH_TYPE as PdvAuthType | undefined) ?? "bearer";
  if (!system || !baseUrl || !apiKey) return null;
  return {
    system,
    baseUrl,
    apiKey,
    apiSecret: process.env.PDV_API_SECRET,
    authType,
    storeId: process.env.PDV_STORE_ID,
  };
}

export class PdvDataSource implements DataSource {
  readonly sourceSystem = "pdv" as const;
  readonly channel: Channel = "fisica";

  constructor(private readonly config: PdvConfig) {}

  async getOrders(_range: DateRange, _filters?: OrderFilters): Promise<Order[]> {
    throw new Error("PdvDataSource.getOrders não implementado (Fase 5).");
  }

  async getFunnel(_range: DateRange, _filters?: OrderFilters): Promise<FunnelSnapshot> {
    throw new Error("PdvDataSource.getFunnel não implementado (Fase 5).");
  }

  async getAttributionBreakdown(_range: DateRange): Promise<AttributionRow[]> {
    throw new Error("PdvDataSource.getAttributionBreakdown não implementado (Fase 5).");
  }

  async getTopProducts(_range: DateRange, _limit?: number): Promise<ProductRow[]> {
    throw new Error("PdvDataSource.getTopProducts não implementado (Fase 5).");
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      ok: false,
      isMock: false,
      status: "demo",
      message: `Sistema PDV (${this.config.system}) detectado, mas o conector real chega na Fase 5. Usando demonstração por enquanto.`,
      lastSyncedAt: null,
    };
  }
}
