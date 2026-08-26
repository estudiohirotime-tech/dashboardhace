// -----------------------------------------------------------------------------
// MockInstagramSource — dados fictícios porém realistas de uma conta BR de porte
// médio. Seed fixa (números estáveis). Alimenta a dashboard sem precisar de token.
// -----------------------------------------------------------------------------

import { Rng } from "../data-sources/mock/rng";
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
  KpiValue,
  AccountProfile,
} from "./types";

const SEED = "instagram-fixture-2026";
const WINDOW_DAYS = 120;

interface DailyPoint {
  date: string; // yyyy-mm-dd
  followers: number; // acumulado no fim do dia
  netChange: number;
  reach: number;
  views: number;
  profileViews: number;
}

interface Universe {
  profile: AccountProfile;
  daily: DailyPoint[];
  media: MediaItem[];
  demographics: AudienceDemographics;
}

const CAPTIONS = [
  "5 erros que travam o seu crescimento 🚫",
  "Bastidores da nossa última campanha ✨",
  "Salva esse post pra não esquecer 📌",
  "O antes e depois que ninguém te mostra",
  "Responde nos comentários 👇",
  "Tutorial rápido: faça em 3 passos",
  "A verdade sobre engajamento no Instagram",
  "Novidade chegando essa semana 👀",
  "Reels que viralizou — veja por quê",
  "Dica de ouro pra sua bio converter mais",
];

const MEDIA_MIX: { type: MediaType; weight: number }[] = [
  { type: "REELS", weight: 0.42 },
  { type: "IMAGE", weight: 0.28 },
  { type: "CAROUSEL_ALBUM", weight: 0.25 },
  { type: "VIDEO", weight: 0.05 },
];

let cache: Universe | null = null;

function dayString(d: Date): string {
  return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function build(): Universe {
  const rng = new Rng(SEED);
  const now = new Date();

  // --- Série diária de seguidores/alcance ---
  const daily: DailyPoint[] = [];
  let followers = 21850; // base ~120 dias atrás
  for (let d = WINDOW_DAYS - 1; d >= 0; d--) {
    const date = dayString(new Date(now.getTime() - d * 86400 * 1000));
    const weekday = new Date(`${date}T12:00:00-03:00`).getDay();
    const isPostDay = rng.chance(0.55);
    // Ganho líquido diário: base + ruído; picos ocasionais (reel viral).
    let net = Math.round(40 + rng.gaussian() * 45);
    if (rng.chance(0.06)) net += rng.int(250, 900); // viral
    if (rng.chance(0.05)) net -= rng.int(60, 200); // dia ruim / unfollows
    followers += net;

    const weekendBoost = weekday === 0 || weekday === 6 ? 1.15 : 1;
    const reach = Math.round((isPostDay ? 14000 : 6500) * weekendBoost * (0.8 + rng.float() * 0.5) + Math.abs(net) * 8);
    const views = Math.round(reach * (1.5 + rng.float() * 0.6));
    const profileViews = Math.round(reach * (0.04 + rng.float() * 0.03));

    daily.push({ date, followers, netChange: net, reach, views, profileViews });
  }

  const profile: AccountProfile = {
    id: "mock-ig-1",
    username: "sua.marca",
    name: "Sua Marca",
    profilePictureUrl: null,
    followersCount: followers,
    followsCount: 892,
    mediaCount: 0, // preenchido abaixo
  };

  // --- Mídias (posts / reels) ---
  const media: MediaItem[] = [];
  let seq = 9000;
  for (let d = WINDOW_DAYS - 1; d >= 0; d--) {
    // ~0.55 post/dia
    if (!rng.chance(0.55)) continue;
    const dayDate = new Date(now.getTime() - d * 86400 * 1000);
    const hour = rng.int(9, 22);
    const ts = new Date(`${dayString(dayDate)}T${String(hour).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00-03:00`).toISOString();
    const type = rng.weighted(MEDIA_MIX.map((m) => m.type), MEDIA_MIX.map((m) => m.weight));

    const viral = rng.chance(0.12);
    const baseReach = type === "REELS" ? 26000 : type === "CAROUSEL_ALBUM" ? 15000 : 12000;
    const reach = Math.round(baseReach * (0.5 + rng.float() * 1.1) * (viral ? 3.4 : 1));
    const views = type === "REELS" || type === "VIDEO" ? Math.round(reach * (2.2 + rng.float() * 1.5)) : reach;
    const likes = Math.round(reach * (0.06 + rng.float() * 0.05));
    const comments = Math.round(likes * (0.02 + rng.float() * 0.03));
    const saves = Math.round(reach * (0.015 + rng.float() * 0.02));
    const shares = Math.round(reach * (0.01 + rng.float() * 0.02));
    const engagement = likes + comments + saves + shares;

    media.push({
      id: `mock-media-${seq++}`,
      type,
      caption: rng.pick(CAPTIONS),
      permalink: "https://instagram.com/",
      thumbnailUrl: null,
      timestamp: ts,
      likes,
      comments,
      saves,
      shares,
      reach,
      views,
      engagement,
      engagementRate: reach ? engagement / reach : 0,
    });
  }
  profile.mediaCount = 340 + media.length;

  // --- Demografia ---
  const mk = (rows: [string, number][]): { label: string; value: number; share: number }[] => {
    const total = rows.reduce((a, [, v]) => a + v, 0) || 1;
    return rows.map(([label, v]) => ({ label, value: Math.round((v / total) * followers), share: v / total }));
  };
  const demographics: AudienceDemographics = {
    totalFollowers: followers,
    byCity: mk([
      ["São Paulo", 34], ["Rio de Janeiro", 18], ["Belo Horizonte", 9], ["Curitiba", 7],
      ["Porto Alegre", 6], ["Brasília", 5], ["Salvador", 4], ["Outras", 17],
    ]),
    byCountry: mk([["Brasil", 88], ["Portugal", 5], ["Estados Unidos", 3], ["Outros", 4]]),
    byAge: mk([["13-17", 4], ["18-24", 31], ["25-34", 38], ["35-44", 17], ["45-54", 7], ["55+", 3]]),
    byGender: mk([["Feminino", 62], ["Masculino", 36], ["Não informado", 2]]),
    isMock: true,
  };

  return { profile, daily, media, demographics };
}

function universe(): Universe {
  if (!cache) cache = build();
  return cache;
}

function inRange(dateOrIso: string, range: DateRange): boolean {
  const t = new Date(dateOrIso.length === 10 ? `${dateOrIso}T12:00:00-03:00` : dateOrIso).getTime();
  return t >= new Date(range.from).getTime() && t <= new Date(range.to).getTime();
}

function dailyIn(range: DateRange): DailyPoint[] {
  return universe().daily.filter((p) => inRange(p.date, range));
}

function previousRange(range: DateRange): DateRange {
  const dur = new Date(range.to).getTime() - new Date(range.from).getTime();
  const to = new Date(new Date(range.from).getTime() - 1);
  const from = new Date(to.getTime() - dur);
  return { from: from.toISOString(), to: to.toISOString() };
}

function delta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 1;
  return (cur - prev) / prev;
}

function kpi(cur: number, prev: number): KpiValue {
  return { value: cur, previous: prev, delta: delta(cur, prev) };
}

function bucketKey(date: string, g: Granularity): string {
  if (g === "day") return date;
  const d = new Date(`${date}T12:00:00-03:00`);
  if (g === "week") {
    const day = d.getDay();
    const monday = new Date(d.getTime() - ((day + 6) % 7) * 86400 * 1000);
    return dayString(monday);
  }
  return `${date.slice(0, 7)}-01`;
}

export class MockInstagramSource implements InstagramSource {
  readonly isMock = true;

  async getOverview(range: DateRange): Promise<Overview> {
    const cur = dailyIn(range);
    const prev = dailyIn(previousRange(range));
    const u = universe();

    const followersEnd = cur.length ? cur[cur.length - 1]!.followers : u.profile.followersCount;
    const followersPrevEnd = prev.length ? prev[prev.length - 1]!.followers : followersEnd;

    const netCur = cur.reduce((a, p) => a + p.netChange, 0);
    const netPrev = prev.reduce((a, p) => a + p.netChange, 0);
    const reachCur = cur.reduce((a, p) => a + p.reach, 0);
    const reachPrev = prev.reduce((a, p) => a + p.reach, 0);
    const viewsCur = cur.reduce((a, p) => a + p.views, 0);
    const viewsPrev = prev.reduce((a, p) => a + p.views, 0);
    const pvCur = cur.reduce((a, p) => a + p.profileViews, 0);
    const pvPrev = prev.reduce((a, p) => a + p.profileViews, 0);

    const media = u.media.filter((m) => inRange(m.timestamp, range));
    const mediaPrev = u.media.filter((m) => inRange(m.timestamp, previousRange(range)));
    const erCur = engagementRate(media);
    const erPrev = engagementRate(mediaPrev);

    return {
      profile: { ...u.profile, followersCount: followersEnd },
      followers: kpi(followersEnd, followersPrevEnd),
      netFollowers: kpi(netCur, netPrev),
      reach: kpi(reachCur, reachPrev),
      views: kpi(viewsCur, viewsPrev),
      profileViews: kpi(pvCur, pvPrev),
      engagementRate: kpi(erCur, erPrev),
      isMock: true,
    };
  }

  async getFollowerGrowth(range: DateRange, g: Granularity): Promise<FollowerGrowth> {
    const cur = dailyIn(range);
    const map = new Map<string, { followers: number; net: number }>();
    for (const p of cur) {
      const key = bucketKey(p.date, g);
      const row = map.get(key) ?? { followers: p.followers, net: 0 };
      row.followers = p.followers; // último do bucket
      row.net += p.netChange;
      map.set(key, row);
    }
    const points = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, r]) => ({ bucket, followers: r.followers, netChange: r.net }));
    return { points, granularity: g, isMock: true };
  }

  async getReachTimeseries(range: DateRange, g: Granularity): Promise<ReachTimeseries> {
    const cur = dailyIn(range);
    const map = new Map<string, { reach: number; views: number }>();
    for (const p of cur) {
      const key = bucketKey(p.date, g);
      const row = map.get(key) ?? { reach: 0, views: 0 };
      row.reach += p.reach;
      row.views += p.views;
      map.set(key, row);
    }
    const points = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, r]) => ({ bucket, reach: r.reach, views: r.views }));
    return { points, granularity: g, isMock: true };
  }

  async getTopMedia(range: DateRange, limit = 10): Promise<MediaList> {
    const items = universe().media
      .filter((m) => inRange(m.timestamp, range))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, limit);
    return { items, isMock: true };
  }

  async getRecentMedia(range: DateRange, limit = 12): Promise<MediaList> {
    const items = universe().media
      .filter((m) => inRange(m.timestamp, range))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
    return { items, isMock: true };
  }

  async getAudience(): Promise<AudienceDemographics> {
    return universe().demographics;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      ok: true,
      isMock: true,
      status: "demo",
      message: "Instagram em modo demonstração (dados fictícios).",
      tokenExpiresAt: null,
      lastSyncedAt: null,
    };
  }
}

function engagementRate(media: MediaItem[]): number {
  if (!media.length) return 0;
  const totalEng = media.reduce((a, m) => a + m.engagement, 0);
  const totalReach = media.reduce((a, m) => a + m.reach, 0);
  return totalReach ? totalEng / totalReach : 0;
}
