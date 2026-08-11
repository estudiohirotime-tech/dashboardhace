// -----------------------------------------------------------------------------
// Parser de UTM com fallback em cascata.
//
// Ordem de resolução:
//   1. Query string de landingPageUrl
//   2. customAttributes com chaves utm_source, utm_medium, etc.
//   3. Inferência a partir de referrerUrl (l.instagram.com -> organic_social,
//      googleadservices.com -> paid_search, etc.)
//   4. Se nada for encontrado -> direct
// -----------------------------------------------------------------------------

export interface RawUtm {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
}

export interface ParseUtmInput {
  landingPageUrl?: string | null;
  referrerUrl?: string | null;
  customAttributes?: Record<string, string | null | undefined> | null;
}

const EMPTY: RawUtm = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
};

function clean(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

/** Extrai UTMs de uma query string (aceita URL completa ou só a query). */
function fromQueryString(input: string | null | undefined): RawUtm {
  if (!input) return { ...EMPTY };
  let params: URLSearchParams;
  try {
    // Aceita URL absoluta, relativa ("/pagina?x=1") ou query pura ("?x=1").
    if (input.includes("?")) {
      const query = input.slice(input.indexOf("?") + 1);
      params = new URLSearchParams(query);
    } else if (/^[^=/]+=/.test(input)) {
      params = new URLSearchParams(input);
    } else {
      return { ...EMPTY };
    }
  } catch {
    return { ...EMPTY };
  }
  return {
    utmSource: clean(params.get("utm_source")),
    utmMedium: clean(params.get("utm_medium")),
    utmCampaign: clean(params.get("utm_campaign")),
    utmContent: clean(params.get("utm_content")),
    utmTerm: clean(params.get("utm_term")),
  };
}

/** Extrai UTMs de customAttributes (chaves utm_source, utm_medium, ...). */
function fromCustomAttributes(
  attrs: Record<string, string | null | undefined> | null | undefined,
): RawUtm {
  if (!attrs) return { ...EMPTY };
  const lower: Record<string, string | null | undefined> = {};
  for (const [k, v] of Object.entries(attrs)) {
    lower[k.trim().toLowerCase()] = v;
  }
  return {
    utmSource: clean(lower["utm_source"]),
    utmMedium: clean(lower["utm_medium"]),
    utmCampaign: clean(lower["utm_campaign"]),
    utmContent: clean(lower["utm_content"]),
    utmTerm: clean(lower["utm_term"]),
  };
}

function hasAnyUtm(utm: RawUtm): boolean {
  return Boolean(
    utm.utmSource || utm.utmMedium || utm.utmCampaign || utm.utmContent || utm.utmTerm,
  );
}

/** Retorna o host de uma URL, minúsculo e sem "www.". Null se inválida. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Resolve as UTMs combinando as fontes na ordem de prioridade.
 * Cada campo é preenchido pela primeira fonte que o tiver (não sobrescreve
 * um valor já resolvido com null de uma fonte de menor prioridade).
 */
export function parseUtm(input: ParseUtmInput): RawUtm {
  const fromLanding = fromQueryString(input.landingPageUrl);
  const fromAttrs = fromCustomAttributes(input.customAttributes);

  const merged: RawUtm = { ...EMPTY };
  (Object.keys(EMPTY) as (keyof RawUtm)[]).forEach((key) => {
    merged[key] = fromLanding[key] ?? fromAttrs[key] ?? null;
  });

  return merged;
}

export const __testing = {
  fromQueryString,
  fromCustomAttributes,
  hasAnyUtm,
};
