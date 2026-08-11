// -----------------------------------------------------------------------------
// Contrato único de dados — TODA a aplicação consome esta interface.
// Nunca importe a Shopify (ou o PDV) diretamente na UI. Sempre via DataSource.
//
// Regra de ouro: valores monetários são SEMPRE inteiros em centavos (BRL).
// A formatação acontece só na borda da UI.
// -----------------------------------------------------------------------------

export type Channel = "online" | "fisica";

export type SourceSystem = "shopify" | "pdv" | "mock";

export type FinancialStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "partially_refunded";

export type ChannelGroup =
  | "paid_social"
  | "paid_search"
  | "organic_search"
  | "organic_social"
  | "email"
  | "direct"
  | "referral"
  | "influencer"
  | "loja_fisica"
  | "unknown";

export interface DateRange {
  /** Início do intervalo, ISO 8601. Inclusivo. */
  from: string;
  /** Fim do intervalo, ISO 8601. Inclusivo. */
  to: string;
}

export interface TouchPoint {
  occurredAt: string; // ISO 8601
  source: string | null;
  medium: string | null;
  campaign: string | null;
  landingPage: string | null;
  referrer: string | null;
  channelGroup: ChannelGroup;
}

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPage: string | null;
  referrer: string | null;
  /** Derivado — ver channel-grouping.ts */
  channelGroup: ChannelGroup;
  firstTouch: TouchPoint | null;
  lastTouch: TouchPoint | null;
}

export interface OrderCustomer {
  id: string | null;
  name: string | null;
  email: string | null;
  isReturning: boolean;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  title: string;
  quantity: number;
  unitPrice: number; // centavos
  total: number; // centavos
}

export interface Order {
  id: string;
  channel: Channel;
  sourceSystem: SourceSystem;
  createdAt: string; // ISO 8601
  total: number; // centavos
  currency: string; // "BRL"
  itemsCount: number;
  customer: OrderCustomer;
  attribution: Attribution;
  items: OrderItem[];
  financialStatus: FinancialStatus;
  // Dimensões da loja física (opcionais; nulas no online)
  vendedor?: string | null;
  unidade?: string | null;
  formaPagamento?: string | null;
}

// -----------------------------------------------------------------------------
// Funil
// -----------------------------------------------------------------------------

export type FunnelStageKey =
  | "sessions"
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "checkout_info"
  | "purchase";

export interface FunnelStage {
  key: FunnelStageKey;
  label: string;
  count: number;
  /** 0 a 1 — conversão em relação à etapa anterior */
  conversionFromPrevious: number;
  /** 0 a 1 — conversão em relação ao topo do funil */
  conversionFromTop: number;
  /** count da etapa anterior menos este count */
  dropOff: number;
  /** true quando esta etapa é o maior gargalo (maior queda percentual) */
  isBottleneck?: boolean;
  /** true quando esta etapa está sendo alimentada por mock */
  isMock?: boolean;
}

export interface FunnelSnapshot {
  period: DateRange;
  channel: Channel | "all";
  stages: FunnelStage[];
  /** true se qualquer etapa do funil vem de dados fictícios */
  isMock: boolean;
}

// -----------------------------------------------------------------------------
// Atribuição agregada (tabela de origens)
// -----------------------------------------------------------------------------

export interface AttributionRow {
  channelGroup: ChannelGroup;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  orders: number;
  revenue: number; // centavos
  customers: number;
  averageTicket: number; // centavos
  /** participação na receita total do período, 0 a 1 */
  revenueShare: number;
}

// -----------------------------------------------------------------------------
// Produtos
// -----------------------------------------------------------------------------

export interface ProductRow {
  productId: string;
  title: string;
  unitsSold: number;
  revenue: number; // centavos
  orders: number;
  revenueOnline: number; // centavos
  revenueFisica: number; // centavos
}

// -----------------------------------------------------------------------------
// Filtros
// -----------------------------------------------------------------------------

export interface OrderFilters {
  channel?: Channel | "all";
  channelGroup?: ChannelGroup;
  utmCampaign?: string;
  utmSource?: string;
  financialStatus?: FinancialStatus;
  search?: string;
}

// -----------------------------------------------------------------------------
// Health check / status de conexão
// -----------------------------------------------------------------------------

export type ConnectionStatus = "connected" | "delayed" | "demo";

export interface HealthCheckResult {
  ok: boolean;
  message: string;
  isMock: boolean;
  /** status para o ponto colorido no topbar */
  status?: ConnectionStatus;
  lastSyncedAt?: string | null;
}

// -----------------------------------------------------------------------------
// A INTERFACE. Todo adapter (mock, shopify, pdv) implementa isto.
// -----------------------------------------------------------------------------

export interface DataSource {
  /** Identidade da fonte, para badges e roteamento. */
  readonly sourceSystem: SourceSystem;
  /** Canal que esta fonte alimenta. */
  readonly channel: Channel;

  getOrders(range: DateRange, filters?: OrderFilters): Promise<Order[]>;
  getFunnel(range: DateRange, filters?: OrderFilters): Promise<FunnelSnapshot>;
  getAttributionBreakdown(range: DateRange): Promise<AttributionRow[]>;
  getTopProducts(range: DateRange, limit?: number): Promise<ProductRow[]>;
  healthCheck(): Promise<HealthCheckResult>;
}
