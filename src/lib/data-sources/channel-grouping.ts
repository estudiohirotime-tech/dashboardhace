// -----------------------------------------------------------------------------
// Agrupamento de canal (ChannelGroup) — fonte única de verdade.
//
// Aplica, em ordem de precedência, a tabela de regras definida no projeto.
// A lista de parceiros/influenciadores vem de partners.json (editável),
// nunca hardcoded no meio da lógica.
// -----------------------------------------------------------------------------

import type { ChannelGroup } from "./types";
import type { RawUtm } from "./utm-parser";
import { hostOf } from "./utm-parser";
import partnersData from "./partners.json";

export interface ChannelGroupInput {
  utm: RawUtm;
  referrerUrl?: string | null;
  /** Pedido originado no POS/loja física. Sempre vence: loja_fisica. */
  isPos?: boolean;
}

// --- Conjuntos de referência --------------------------------------------------

/** Termos que caracterizam mídia paga em utm_medium. */
const PAID_MEDIUM_TOKENS = ["cpc", "ppc", "paid", "cpm", "display", "cpv"];

/** Sources de busca. */
const SEARCH_SOURCES = new Set([
  "google",
  "bing",
  "yahoo",
  "duckduckgo",
  "ecosia",
  "yandex",
  "baidu",
  "ask",
  "brave",
]);

/** Sources de redes sociais. */
const SOCIAL_SOURCES = new Set([
  "facebook",
  "instagram",
  "meta",
  "fb",
  "ig",
  "tiktok",
  "twitter",
  "x",
  "pinterest",
  "linkedin",
  "youtube",
  "snapchat",
  "reddit",
  "threads",
  "kwai",
]);

/** Hosts de redes sociais (para inferência por referrer). */
const SOCIAL_HOST_PATTERNS = [
  "facebook.com",
  "l.facebook.com",
  "m.facebook.com",
  "instagram.com",
  "l.instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "t.co",
  "pinterest.",
  "linkedin.com",
  "lnkd.in",
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "threads.net",
  "snapchat.com",
  "kwai.com",
];

/** Hosts de buscadores (para inferência por referrer). */
const SEARCH_HOST_PATTERNS = [
  "google.",
  "bing.com",
  "search.yahoo",
  "duckduckgo.com",
  "ecosia.org",
  "yandex.",
  "baidu.com",
  "ask.com",
  "search.brave.com",
];

/** Hosts de redes de anúncio (referrer pago sem UTM). */
const AD_HOST_PATTERNS = [
  "googleadservices.com",
  "doubleclick.net",
  "googlesyndication.com",
  "ads.google.com",
];

// --- Lista de parceiros -------------------------------------------------------

function loadPartnerSources(): Set<string> {
  const set = new Set<string>();
  const influencers = (partnersData.influencers ?? []) as string[];
  const affiliates = (partnersData.affiliates ?? []) as string[];
  for (const s of [...influencers, ...affiliates]) {
    if (typeof s === "string" && s.trim()) set.add(s.trim().toLowerCase());
  }
  return set;
}

let partnerSources = loadPartnerSources();

/** Permite recarregar a lista após edição via /configuracoes. */
export function setPartnerSources(sources: string[]): void {
  partnerSources = new Set(
    sources.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim().toLowerCase()),
  );
}

// --- Helpers ------------------------------------------------------------------

function isPaidMedium(medium: string | null): boolean {
  if (!medium) return false;
  const m = medium.toLowerCase();
  return PAID_MEDIUM_TOKENS.some((t) => m.includes(t));
}

function matchesAny(host: string, patterns: string[]): boolean {
  return patterns.some((p) => host === p || host.startsWith(p) || host.includes(p));
}

// --- Classificador principal --------------------------------------------------

export function classifyChannelGroup(input: ChannelGroupInput): ChannelGroup {
  const { utm, referrerUrl, isPos } = input;

  // 0. POS sempre vence.
  if (isPos) return "loja_fisica";

  const source = utm.utmSource;
  const medium = utm.utmMedium;
  const paid = isPaidMedium(medium);

  // 1. Influenciador / afiliado (medium explícito OU source cadastrado).
  if (medium === "influencer" || medium === "affiliate" || medium === "afiliado") {
    return "influencer";
  }
  if (source && partnerSources.has(source)) {
    return "influencer";
  }

  // 2. Email / newsletter.
  if (medium === "email" || medium === "newsletter" || medium === "e-mail") {
    return "email";
  }

  // 3. Paid search: source de busca + medium pago.
  if (source && SEARCH_SOURCES.has(source) && paid) {
    return "paid_search";
  }

  // 4. Paid social: source de rede social + medium pago.
  if (source && SOCIAL_SOURCES.has(source) && paid) {
    return "paid_social";
  }

  // 5. Há UTM source, mas não é paga nem casou acima → classifica pelo tipo.
  if (source) {
    if (SEARCH_SOURCES.has(source)) return "organic_search";
    if (SOCIAL_SOURCES.has(source)) return "organic_social";
    // source presente mas desconhecido → tratado como referral tagueado.
    return "referral";
  }

  // 6. Sem UTM → inferência pelo referrer.
  const host = hostOf(referrerUrl);
  if (host) {
    if (matchesAny(host, AD_HOST_PATTERNS)) return "paid_search";
    if (matchesAny(host, SEARCH_HOST_PATTERNS)) return "organic_search";
    if (matchesAny(host, SOCIAL_HOST_PATTERNS)) return "organic_social";
    return "referral";
  }

  // 7. Sem referrer e sem UTM.
  return "direct";
}

export const __testing = {
  isPaidMedium,
  loadPartnerSources,
};
