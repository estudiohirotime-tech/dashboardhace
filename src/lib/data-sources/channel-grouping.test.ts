import { describe, it, expect } from "vitest";
import { classifyChannelGroup } from "./channel-grouping";
import type { RawUtm } from "./utm-parser";

function utm(partial: Partial<RawUtm>): RawUtm {
  return {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    ...partial,
  };
}

describe("classifyChannelGroup", () => {
  it("POS sempre vira loja_fisica, mesmo com UTM", () => {
    expect(
      classifyChannelGroup({
        utm: utm({ utmSource: "google", utmMedium: "cpc" }),
        isPos: true,
      }),
    ).toBe("loja_fisica");
  });

  it("google + cpc = paid_search", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "google", utmMedium: "cpc" }) }),
    ).toBe("paid_search");
  });

  it("bing + ppc = paid_search", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "bing", utmMedium: "ppc" }) }),
    ).toBe("paid_search");
  });

  it("instagram + paid = paid_social", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "instagram", utmMedium: "paid_social" }) }),
    ).toBe("paid_social");
  });

  it("facebook + cpc = paid_social", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "fb", utmMedium: "cpc" }) }),
    ).toBe("paid_social");
  });

  it("medium email = email", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "mailchimp", utmMedium: "email" }) }),
    ).toBe("email");
  });

  it("medium newsletter = email", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmMedium: "newsletter" }) }),
    ).toBe("email");
  });

  it("medium influencer = influencer", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "alguem", utmMedium: "influencer" }) }),
    ).toBe("influencer");
  });

  it("source cadastrado na lista de parceiros = influencer", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "juliana_costa", utmMedium: "social" }) }),
    ).toBe("influencer");
  });

  it("referrer de buscador sem UTM = organic_search", () => {
    expect(
      classifyChannelGroup({ utm: utm({}), referrerUrl: "https://www.google.com/search?q=tenis" }),
    ).toBe("organic_search");
  });

  it("referrer de rede social sem UTM = organic_social", () => {
    expect(
      classifyChannelGroup({ utm: utm({}), referrerUrl: "https://l.instagram.com/" }),
    ).toBe("organic_social");
  });

  it("sem referrer e sem UTM = direct", () => {
    expect(classifyChannelGroup({ utm: utm({}) })).toBe("direct");
  });

  it("outro referrer sem UTM = referral", () => {
    expect(
      classifyChannelGroup({ utm: utm({}), referrerUrl: "https://blogparceiro.com.br/post" }),
    ).toBe("referral");
  });

  it("referrer de rede de anúncio sem UTM = paid_search", () => {
    expect(
      classifyChannelGroup({ utm: utm({}), referrerUrl: "https://www.googleadservices.com/pagead" }),
    ).toBe("paid_search");
  });

  it("utm_source de busca sem medium pago = organic_search", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "google", utmMedium: "organic" }) }),
    ).toBe("organic_search");
  });

  it("utm_source social sem medium pago = organic_social", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "instagram", utmMedium: "bio" }) }),
    ).toBe("organic_social");
  });

  it("utm_source desconhecido = referral", () => {
    expect(
      classifyChannelGroup({ utm: utm({ utmSource: "newsletter-parceira" }) }),
    ).toBe("referral");
  });
});
