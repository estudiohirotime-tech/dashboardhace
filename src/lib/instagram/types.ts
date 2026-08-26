// -----------------------------------------------------------------------------
// Contrato de dados do Instagram. Toda a UI consome esta interface (InstagramSource),
// nunca a Graph API direto. Mesma filosofia de adapters do projeto.
// -----------------------------------------------------------------------------

export interface DateRange {
  from: string; // ISO 8601, inclusivo
  to: string; // ISO 8601, inclusivo
}

export type Granularity = "day" | "week" | "month";

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS" | "STORY";

export type ConnectionStatus = "connected" | "delayed" | "demo";

export interface HealthCheckResult {
  ok: boolean;
  isMock: boolean;
  status: ConnectionStatus;
  message: string;
  /** Quando o token de acesso expira (ISO), quando conhecido. */
  tokenExpiresAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface AccountProfile {
  id: string;
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
}

// --- KPIs / visão geral -------------------------------------------------------

export interface KpiValue {
  value: number;
  previous: number;
  delta: number; // fração vs. período anterior
}

export interface Overview {
  profile: AccountProfile;
  /** Seguidores no fim do período (com variação vs. período anterior). */
  followers: KpiValue;
  /** Novos seguidores líquidos no período. */
  netFollowers: KpiValue;
  reach: KpiValue;
  views: KpiValue; // "views" substitui impressions na API nova
  profileViews: KpiValue;
  engagementRate: KpiValue; // fração 0..1
  isMock: boolean;
}

// --- Séries temporais ---------------------------------------------------------

export interface FollowerPoint {
  bucket: string; // yyyy-mm-dd (ou início do bucket)
  followers: number; // total acumulado
  netChange: number; // variação líquida no bucket
}

export interface FollowerGrowth {
  points: FollowerPoint[];
  granularity: Granularity;
  isMock: boolean;
}

export interface ReachPoint {
  bucket: string;
  reach: number;
  views: number;
}

export interface ReachTimeseries {
  points: ReachPoint[];
  granularity: Granularity;
  isMock: boolean;
}

// --- Conteúdo (posts / reels) -------------------------------------------------

export interface MediaItem {
  id: string;
  type: MediaType;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  timestamp: string; // ISO
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  views: number; // plays para reels/vídeo
  engagement: number; // likes+comments+saves+shares
  engagementRate: number; // engagement / reach (0..1)
}

export interface MediaList {
  items: MediaItem[];
  isMock: boolean;
}

// --- Audiência (demografia) ---------------------------------------------------

export interface DemographicRow {
  label: string;
  value: number;
  share: number; // 0..1
}

export interface AudienceDemographics {
  totalFollowers: number;
  byCity: DemographicRow[];
  byCountry: DemographicRow[];
  byAge: DemographicRow[]; // faixas: 13-17, 18-24, ...
  byGender: DemographicRow[]; // F / M / U
  isMock: boolean;
}

// --- A interface --------------------------------------------------------------

export interface InstagramSource {
  readonly isMock: boolean;
  getOverview(range: DateRange): Promise<Overview>;
  getFollowerGrowth(range: DateRange, granularity: Granularity): Promise<FollowerGrowth>;
  getReachTimeseries(range: DateRange, granularity: Granularity): Promise<ReachTimeseries>;
  getTopMedia(range: DateRange, limit?: number): Promise<MediaList>;
  getRecentMedia(range: DateRange, limit?: number): Promise<MediaList>;
  getAudience(): Promise<AudienceDemographics>;
  healthCheck(): Promise<HealthCheckResult>;
}
