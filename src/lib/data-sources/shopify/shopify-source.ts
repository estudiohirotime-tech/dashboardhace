// -----------------------------------------------------------------------------
// ShopifyDataSource — STUB (Fase 1).
// A implementação real (Admin API GraphQL, backfill, parser de UTM aplicado aos
// pedidos) chega na Fase 3. Por ora o healthCheck reporta "não implementado",
// o que faz o registry cair automaticamente no mock da loja online — sem quebrar
// a tela e sem apresentar número real inexistente.
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

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  apiVersion: string;
  webhookSecret?: string;
}

export function readShopifyConfig(): ShopifyConfig | null {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2025-01";
  if (!storeDomain || !accessToken) return null;
  return {
    storeDomain,
    accessToken,
    apiVersion,
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
  };
}

export class ShopifyDataSource implements DataSource {
  readonly sourceSystem = "shopify" as const;
  readonly channel: Channel = "online";

  constructor(private readonly config: ShopifyConfig) {}

  async getOrders(_range: DateRange, _filters?: OrderFilters): Promise<Order[]> {
    throw new Error("ShopifyDataSource.getOrders não implementado (Fase 3).");
  }

  async getFunnel(_range: DateRange, _filters?: OrderFilters): Promise<FunnelSnapshot> {
    throw new Error("ShopifyDataSource.getFunnel não implementado (Fase 3).");
  }

  async getAttributionBreakdown(_range: DateRange): Promise<AttributionRow[]> {
    throw new Error("ShopifyDataSource.getAttributionBreakdown não implementado (Fase 3).");
  }

  async getTopProducts(_range: DateRange, _limit?: number): Promise<ProductRow[]> {
    throw new Error("ShopifyDataSource.getTopProducts não implementado (Fase 3).");
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Credenciais existem, mas o adapter real ainda não foi implementado.
    return {
      ok: false,
      isMock: false,
      status: "demo",
      message:
        "Credenciais Shopify detectadas, mas o conector real chega na Fase 3. Usando demonstração por enquanto.",
      lastSyncedAt: null,
    };
  }
}
