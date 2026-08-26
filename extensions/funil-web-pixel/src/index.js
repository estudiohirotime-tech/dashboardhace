// Web Pixels Extension — Funil Omnichannel.
//
// Escuta os eventos padrão do storefront (funciona inclusive no checkout, onde
// scripts comuns não rodam) e envia ao nosso endpoint. Carimba as UTMs
// capturadas na primeira página da sessão, resolvendo atribuição de 1º clique.
//
// Eventos padrão observados:
//   page_viewed, product_viewed, product_added_to_cart, checkout_started,
//   checkout_contact_info_submitted, checkout_completed

import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, settings, init }) => {
  const endpoint = settings.endpoint;
  if (!endpoint) return;

  // Captura as UTMs da URL de entrada (primeiro clique) e persiste na sessão.
  const UTM_KEY = "funil_utms";

  function parseUtms(search) {
    try {
      const params = new URLSearchParams(search || "");
      const pick = (k) => params.get(k) || null;
      const utms = {
        utmSource: pick("utm_source"),
        utmMedium: pick("utm_medium"),
        utmCampaign: pick("utm_campaign"),
      };
      return utms.utmSource || utms.utmMedium || utms.utmCampaign ? utms : null;
    } catch (_e) {
      return null;
    }
  }

  async function getStoredUtms() {
    try {
      const raw = await browser.sessionStorage.getItem(UTM_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  async function ensureUtms(event) {
    const search =
      event?.context?.document?.location?.search ??
      init?.context?.document?.location?.search ??
      "";
    const fromUrl = parseUtms(search);
    if (fromUrl) {
      try {
        await browser.sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      } catch (_e) {
        /* sessionStorage pode ser restrito no modo strict */
      }
      return fromUrl;
    }
    return (await getStoredUtms()) || { utmSource: null, utmMedium: null, utmCampaign: null };
  }

  function send(eventName, event, utms) {
    const payload = {
      event: eventName,
      sessionId: event?.clientId || init?.data?.shop?.myshopifyDomain || "unknown",
      occurredAt: event?.timestamp || new Date().toISOString(),
      channel: "online",
      utmSource: utms.utmSource,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
    };
    // Beacon é ideal (não bloqueia navegação); fallback para fetch keepalive.
    const body = JSON.stringify(payload);
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
        return;
      }
    } catch (_e) {
      /* cai no fetch */
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  const EVENTS = [
    "page_viewed",
    "product_viewed",
    "product_added_to_cart",
    "checkout_started",
    "checkout_contact_info_submitted",
    "checkout_completed",
  ];

  for (const name of EVENTS) {
    analytics.subscribe(name, async (event) => {
      const utms = await ensureUtms(event);
      send(name, event, utms);
    });
  }
});
