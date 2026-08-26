// -----------------------------------------------------------------------------
// Decide qual fonte usar: Instagram real (se configurado e saudável) ou mock.
// Fallback automático — a tela nunca quebra por falta de token.
// -----------------------------------------------------------------------------

import "server-only";
import type { InstagramSource, HealthCheckResult, ConnectionStatus } from "./types";
import { MockInstagramSource } from "./mock";
import { InstagramGraphSource } from "./graph";
import { readInstagramConfig, isInstagramFixture } from "./config";

export interface ResolvedInstagram {
  source: InstagramSource;
  isMock: boolean;
  configured: boolean;
  health: HealthCheckResult;
}

export async function resolveInstagram(): Promise<ResolvedInstagram> {
  const mock = new MockInstagramSource();
  const config = readInstagramConfig();

  if (!config) {
    const health = await mock.healthCheck();
    return { source: mock, isMock: true, configured: false, health };
  }

  const real = new InstagramGraphSource(config);
  try {
    const health = await real.healthCheck();
    if (health.ok) return { source: real, isMock: false, configured: true, health };
    const mockHealth = await mock.healthCheck();
    return { source: mock, isMock: true, configured: true, health: { ...mockHealth, message: health.message } };
  } catch (err) {
    const mockHealth = await mock.healthCheck();
    const message = err instanceof Error ? err.message : String(err);
    return { source: mock, isMock: true, configured: true, health: { ...mockHealth, message: `Falha na Graph API, usando demonstração: ${message}` } };
  }
}

export interface InstagramMeta {
  status: ConnectionStatus;
  isMock: boolean;
  configured: boolean;
  fixture: boolean;
  message: string;
  username: string | null;
}

export async function getInstagramMeta(): Promise<InstagramMeta> {
  const r = await resolveInstagram();
  const username = r.health.message.match(/@([\w.]+)/)?.[1] ?? null;
  return {
    status: r.health.status ?? "demo",
    isMock: r.isMock,
    configured: r.configured,
    fixture: isInstagramFixture(),
    message: r.health.message,
    username,
  };
}
