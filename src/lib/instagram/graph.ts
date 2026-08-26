// -----------------------------------------------------------------------------
// InstagramGraphSource — adapter REAL (Instagram Graph API via Facebook).
// Todas as chamadas rodam no servidor. Endpoints estáveis (perfil, mídia) são
// implementados por completo; os de insights (alcance, seguidores, demografia)
// usam parsing defensivo e degradam para vazio se a Meta responder diferente —
// a Meta renomeou várias métricas em 2024, então o mapeamento fino é validado
// na conexão real. Nada de segredo no cliente.
// -----------------------------------------------------------------------------

import "server-only";
import { z } from "zod";
import type {
  InstagramSource,
  Overview,
  FollowerGrowth,
  ReachTimeseries,
  MediaList,
  MediaItem,
  MediaType,
  AudienceDemographics,
  HealthCheckResult,
  DateRange,
  Granularity,
  DemographicRow,
  KpiValue,
} from "./types";
import type { InstagramConfig } from "./config";

const BASE = "https://graph.facebook.com";

function unixSecond(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function delta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 1;
  return (cur - prev) / prev;
}
function kpi(cur: number, prev: number): KpiValue {
  return { value: cur, previous: prev, delta: delta(cur, prev) };
}
function previousRange(range: DateRange): DateRange {
  const dur = new Date(range.to).getTime() - new Date(range.from).getTime();
  const to = new Date(new Date(range.from).getTime() - 1);
  const from = new Date(to.getTime() - dur);
  return { from: from.toISOString(), to: to.toISOString() };
}

// --- Schemas (lenientes) ------------------------------------------------------

const profileSchema = z.object({
  id: z.string(),
  username: z.string().nullish().transform((v) => v ?? "conta"),
  name: z.string().nullish().transform((v) => v ?? null),
  profile_picture_url: z.string().nullish().transform((v) => v ?? null),
  followers_count: z.number().nullish().transform((v) => v ?? 0),
  follows_count: z.number().nullish().transform((v) => v ?? 0),
  media_count: z.number().nullish().transform((v) => v ?? 0),
});

const insightValue = z.object({
  value: z.number().nullish().transform((v) => v ?? 0),
  end_time: z.string().nullish().transform((v) => v ?? null),
});

const insightEntry = z.object({
  name: z.string(),
  period: z.string().nullish(),
  values: z.array(insightValue).nullish().transform((v) => v ?? []),
  total_value: z
    .object({ value: z.number().nullish().transform((v) => v ?? 0) })
    .nullish()
    .transform((v) => v ?? null),
});

const insightsResponse = z.object({
  data: z.array(insightEntry).nullish().transform((v) => v ?? []),
});

const mediaNode = z.object({
  id: z.string(),
  caption: z.string().nullish().transform((v) => v ?? null),
  media_type: z.string().nullish().transform((v) => v ?? "IMAGE"),
  media_product_type: z.string().nullish().transform((v) => v ?? null),
  permalink: z.string().nullish().transform((v) => v ?? null),
  thumbnail_url: z.string().nullish().transform((v) => v ?? null),
  media_url: z.string().nullish().transform((v) => v ?? null),
  timestamp: z.string(),
  like_count: z.number().nullish().transform((v) => v ?? 0),
  comments_count: z.number().nullish().transform((v) => v ?? 0),
});

const mediaListResponse = z.object({
  data: z.array(mediaNode).nullish().transform((v) => v ?? []),
});

function mapMediaType(t: string, productType: string | null): MediaType {
  if (productType === "REELS" || t === "REELS") return "REELS";
  if (t === "VIDEO") return "VIDEO";
  if (t === "CAROUSEL_ALBUM") return "CAROUSEL_ALBUM";
  return "IMAGE";
}

export class InstagramGraphSource implements InstagramSource {
  readonly isMock = false;

  constructor(private readonly config: InstagramConfig) {}

  private url(path: string, params: Record<string, string | number | undefined>): string {
    const u = new URL(`${BASE}/${this.config.apiVersion}/${path}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, String(v));
    u.searchParams.set("access_token", this.config.accessToken);
    return u.toString();
  }

  private async get<S extends z.ZodTypeAny>(
    path: string,
    params: Record<string, string | number | undefined>,
    schema: S,
  ): Promise<z.infer<S>> {
    const res = await fetch(this.url(path, params), { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      const msg = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;
      throw new Error(`Instagram Graph API: ${msg}`);
    }
    return schema.parse(json) as z.infer<S>;
  }

  private async profile() {
    return this.get(
      this.config.igUserId,
      { fields: "id,username,name,profile_picture_url,followers_count,follows_count,media_count" },
      profileSchema,
    );
  }

  /** Soma uma métrica de insight (period=day) dentro do range. */
  private async sumMetric(metric: string, range: DateRange): Promise<number> {
    try {
      const data = await this.get(
        `${this.config.igUserId}/insights`,
        { metric, period: "day", since: unixSecond(range.from), until: unixSecond(range.to) },
        insightsResponse,
      );
      const entry = data.data.find((d) => d.name === metric);
      if (!entry) return 0;
      if (entry.values.length) return entry.values.reduce((a, v) => a + v.value, 0);
      return entry.total_value?.value ?? 0;
    } catch {
      return 0;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const p = await this.profile();
      return {
        ok: true,
        isMock: false,
        status: "connected",
        message: `Conectado a @${p.username}.`,
        tokenExpiresAt: null,
        lastSyncedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        ok: false,
        isMock: false,
        status: "demo",
        message: err instanceof Error ? err.message : String(err),
        tokenExpiresAt: null,
      };
    }
  }

  async getOverview(range: DateRange): Promise<Overview> {
    const prev = previousRange(range);
    const p = await this.profile();

    const [reachCur, reachPrev, viewsCur, viewsPrev, pvCur, pvPrev, netCur, netPrev] = await Promise.all([
      this.sumMetric("reach", range),
      this.sumMetric("reach", prev),
      this.sumMetric("views", range),
      this.sumMetric("views", prev),
      this.sumMetric("profile_views", range),
      this.sumMetric("profile_views", prev),
      this.sumMetric("follower_count", range),
      this.sumMetric("follower_count", prev),
    ]);

    const media = (await this.getTopMedia(range, 50)).items;
    const mediaPrev = (await this.getTopMedia(prev, 50)).items;
    const er = engagementRate(media);
    const erPrev = engagementRate(mediaPrev);

    return {
      profile: {
        id: p.id,
        username: p.username,
        name: p.name,
        profilePictureUrl: p.profile_picture_url,
        followersCount: p.followers_count,
        followsCount: p.follows_count,
        mediaCount: p.media_count,
      },
      followers: kpi(p.followers_count, p.followers_count - netCur),
      netFollowers: kpi(netCur, netPrev),
      reach: kpi(reachCur, reachPrev),
      views: kpi(viewsCur, viewsPrev),
      profileViews: kpi(pvCur, pvPrev),
      engagementRate: kpi(er, erPrev),
      isMock: false,
    };
  }

  async getFollowerGrowth(range: DateRange, granularity: Granularity): Promise<FollowerGrowth> {
    // follower_count = novos seguidores por dia. Reconstroi a linha acumulada
    // a partir do total atual, indo para trás.
    let followersNow = 0;
    try {
      followersNow = (await this.profile()).followers_count;
    } catch {
      /* ignore */
    }
    let daily: { end_time: string | null; value: number }[] = [];
    try {
      const data = await this.get(
        `${this.config.igUserId}/insights`,
        { metric: "follower_count", period: "day", since: unixSecond(range.from), until: unixSecond(range.to) },
        insightsResponse,
      );
      daily = data.data.find((d) => d.name === "follower_count")?.values ?? [];
    } catch {
      daily = [];
    }

    // Constroi acumulado do fim para o começo.
    const asc = daily.filter((v) => v.end_time).sort((a, b) => a.end_time!.localeCompare(b.end_time!));
    const cumulative: { date: string; followers: number; netChange: number }[] = [];
    let running = followersNow;
    for (let i = asc.length - 1; i >= 0; i--) {
      const date = asc[i]!.end_time!.slice(0, 10);
      cumulative.unshift({ date, followers: running, netChange: asc[i]!.value });
      running -= asc[i]!.value;
    }

    const map = new Map<string, { followers: number; net: number }>();
    for (const p of cumulative) {
      const key = bucketKey(p.date, granularity);
      const row = map.get(key) ?? { followers: p.followers, net: 0 };
      row.followers = p.followers;
      row.net += p.netChange;
      map.set(key, row);
    }
    const points = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, r]) => ({ bucket, followers: r.followers, netChange: r.net }));
    return { points, granularity, isMock: false };
  }

  async getReachTimeseries(range: DateRange, granularity: Granularity): Promise<ReachTimeseries> {
    const parse = async (metric: string) => {
      try {
        const data = await this.get(
          `${this.config.igUserId}/insights`,
          { metric, period: "day", since: unixSecond(range.from), until: unixSecond(range.to) },
          insightsResponse,
        );
        return data.data.find((d) => d.name === metric)?.values ?? [];
      } catch {
        return [];
      }
    };
    const [reach, views] = await Promise.all([parse("reach"), parse("views")]);
    const map = new Map<string, { reach: number; views: number }>();
    const add = (arr: { end_time: string | null; value: number }[], key: "reach" | "views") => {
      for (const v of arr) {
        if (!v.end_time) continue;
        const bk = bucketKey(v.end_time.slice(0, 10), granularity);
        const row = map.get(bk) ?? { reach: 0, views: 0 };
        row[key] += v.value;
        map.set(bk, row);
      }
    };
    add(reach, "reach");
    add(views, "views");
    const points = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, r]) => ({ bucket, reach: r.reach, views: r.views }));
    return { points, granularity, isMock: false };
  }

  private async mediaInsights(id: string, isVideo: boolean): Promise<{ reach: number; views: number; saves: number; shares: number }> {
    const metric = isVideo ? "reach,saved,shares,views" : "reach,saved,shares";
    try {
      const data = await this.get(`${id}/insights`, { metric }, insightsResponse);
      const pick = (n: string) => {
        const e = data.data.find((d) => d.name === n);
        return e?.total_value?.value ?? (e?.values.length ? e.values[0]!.value : 0);
      };
      return { reach: pick("reach"), views: pick("views"), saves: pick("saved"), shares: pick("shares") };
    } catch {
      return { reach: 0, views: 0, saves: 0, shares: 0 };
    }
  }

  private async fetchMedia(range: DateRange, limit: number): Promise<MediaItem[]> {
    const list = await this.get(
      `${this.config.igUserId}/media`,
      {
        fields: "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count",
        since: unixSecond(range.from),
        until: unixSecond(range.to),
        limit: Math.min(Math.max(limit, 25), 100),
      },
      mediaListResponse,
    );
    const nodes = list.data.filter((m) => {
      const t = new Date(m.timestamp).getTime();
      return t >= new Date(range.from).getTime() && t <= new Date(range.to).getTime();
    });

    const items = await Promise.all(
      nodes.map(async (m) => {
        const type = mapMediaType(m.media_type, m.media_product_type);
        const isVideo = type === "REELS" || type === "VIDEO";
        const ins = await this.mediaInsights(m.id, isVideo);
        const engagement = m.like_count + m.comments_count + ins.saves + ins.shares;
        const reach = ins.reach || 0;
        return {
          id: m.id,
          type,
          caption: m.caption,
          permalink: m.permalink,
          thumbnailUrl: m.thumbnail_url || m.media_url,
          timestamp: m.timestamp,
          likes: m.like_count,
          comments: m.comments_count,
          saves: ins.saves,
          shares: ins.shares,
          reach,
          views: isVideo ? ins.views || reach : reach,
          engagement,
          engagementRate: reach ? engagement / reach : 0,
        } satisfies MediaItem;
      }),
    );
    return items;
  }

  async getTopMedia(range: DateRange, limit = 10): Promise<MediaList> {
    const items = (await this.fetchMedia(range, Math.max(limit, 25)))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, limit);
    return { items, isMock: false };
  }

  async getRecentMedia(range: DateRange, limit = 12): Promise<MediaList> {
    const items = (await this.fetchMedia(range, Math.max(limit, 25)))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
    return { items, isMock: false };
  }

  async getAudience(): Promise<AudienceDemographics> {
    const followers = await this.profile().then((p) => p.followers_count).catch(() => 0);

    const breakdown = async (dimension: string): Promise<DemographicRow[]> => {
      try {
        const u = new URL(`${BASE}/${this.config.apiVersion}/${this.config.igUserId}/insights`);
        u.searchParams.set("metric", "follower_demographics");
        u.searchParams.set("period", "lifetime");
        u.searchParams.set("metric_type", "total_value");
        u.searchParams.set("breakdown", dimension);
        u.searchParams.set("access_token", this.config.accessToken);
        const res = await fetch(u.toString(), { cache: "no-store" });
        const json = (await res.json()) as {
          data?: { total_value?: { breakdowns?: { results?: { dimension_values?: string[]; value?: number }[] }[] } }[];
        };
        const results = json.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
        const total = results.reduce((a, r) => a + (r.value ?? 0), 0) || 1;
        return results
          .map((r) => ({ label: r.dimension_values?.[0] ?? "—", value: r.value ?? 0, share: (r.value ?? 0) / total }))
          .sort((a, b) => b.value - a.value);
      } catch {
        return [];
      }
    };

    const [byCity, byCountry, byAge, byGender] = await Promise.all([
      breakdown("city"),
      breakdown("country"),
      breakdown("age"),
      breakdown("gender"),
    ]);
    return { totalFollowers: followers, byCity, byCountry, byAge, byGender, isMock: false };
  }
}

function engagementRate(media: MediaItem[]): number {
  if (!media.length) return 0;
  const eng = media.reduce((a, m) => a + m.engagement, 0);
  const reach = media.reduce((a, m) => a + m.reach, 0);
  return reach ? eng / reach : 0;
}

function bucketKey(date: string, g: Granularity): string {
  if (g === "day") return date;
  const d = new Date(`${date}T12:00:00-03:00`);
  if (g === "week") {
    const day = d.getDay();
    const monday = new Date(d.getTime() - ((day + 6) % 7) * 86400 * 1000);
    return new Date(monday.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  }
  return `${date.slice(0, 7)}-01`;
}
