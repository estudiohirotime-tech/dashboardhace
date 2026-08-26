// Configuração da integração com o Instagram (Graph API via Facebook).

export interface InstagramConfig {
  appId: string;
  appSecret: string;
  igUserId: string;
  accessToken: string;
  apiVersion: string;
}

function truthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

/** true quando devemos rodar em modo demonstração (fixture). */
export function isInstagramFixture(): boolean {
  return truthy(process.env.IG_FIXTURE);
}

/**
 * Lê a config real do Instagram. Retorna null se faltar algo essencial
 * (aí o registry cai no mock). Ignora tudo se IG_FIXTURE=1.
 */
export function readInstagramConfig(): InstagramConfig | null {
  if (isInstagramFixture()) return null;

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const igUserId = process.env.IG_USER_ID;
  const accessToken = process.env.IG_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || "v21.0";

  if (!igUserId || !accessToken) return null;

  return {
    appId: appId ?? "",
    appSecret: appSecret ?? "",
    igUserId,
    accessToken,
    apiVersion,
  };
}
