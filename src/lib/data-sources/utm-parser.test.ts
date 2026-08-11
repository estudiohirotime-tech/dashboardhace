import { describe, it, expect } from "vitest";
import { parseUtm, hostOf } from "./utm-parser";

describe("parseUtm", () => {
  it("extrai UTMs da query string do landingPageUrl", () => {
    const result = parseUtm({
      landingPageUrl:
        "https://loja.com/produtos?utm_source=Instagram&utm_medium=Paid&utm_campaign=Verao24",
    });
    expect(result.utmSource).toBe("instagram");
    expect(result.utmMedium).toBe("paid");
    expect(result.utmCampaign).toBe("verao24");
  });

  it("cai para customAttributes quando o landing não tem UTM", () => {
    const result = parseUtm({
      landingPageUrl: "https://loja.com/produtos",
      customAttributes: { utm_source: "email", utm_medium: "newsletter" },
    });
    expect(result.utmSource).toBe("email");
    expect(result.utmMedium).toBe("newsletter");
  });

  it("prioriza o landingPageUrl sobre customAttributes campo a campo", () => {
    const result = parseUtm({
      landingPageUrl: "https://loja.com/?utm_source=google",
      customAttributes: { utm_source: "facebook", utm_campaign: "black" },
    });
    expect(result.utmSource).toBe("google"); // landing vence
    expect(result.utmCampaign).toBe("black"); // preenchido pelo attr
  });

  it("retorna tudo null quando não há nada", () => {
    const result = parseUtm({ landingPageUrl: "https://loja.com/" });
    expect(result.utmSource).toBeNull();
    expect(result.utmMedium).toBeNull();
  });

  it("aceita query string pura", () => {
    const result = parseUtm({ landingPageUrl: "?utm_source=tiktok&utm_medium=cpc" });
    expect(result.utmSource).toBe("tiktok");
    expect(result.utmMedium).toBe("cpc");
  });
});

describe("hostOf", () => {
  it("remove www e normaliza para minúsculo", () => {
    expect(hostOf("https://WWW.Google.com/search")).toBe("google.com");
  });

  it("retorna null para entrada inválida", () => {
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf(null)).toBeNull();
  });
});
