// -----------------------------------------------------------------------------
// DataSourceRegistry — decide qual adapter usar por origem (online/física),
// com base nas variáveis de ambiente e no healthCheck.
//
// Regra: se as credenciais de uma fonte não existirem OU o healthCheck falhar,
// a aplicação faz FALLBACK AUTOMÁTICO para o mock daquela fonte específica,
// sem quebrar a tela. As duas fontes são independentes.
// -----------------------------------------------------------------------------

import type { Channel, DataSource, HealthCheckResult } from "./types";
import { MockDataSource } from "./mock/mock-source";
import { ShopifyDataSource, readShopifyConfig } from "./shopify/shopify-source";
import { PdvDataSource, readPdvConfig } from "./pdv/pdv-source";

export interface ResolvedSource {
  /** Adapter efetivamente usado (real ou mock). */
  source: DataSource;
  /** Se o adapter efetivo é o mock. */
  isMock: boolean;
  /** Se havia credenciais configuradas para a fonte real. */
  configured: boolean;
  /** Resultado do healthCheck do adapter efetivo. */
  health: HealthCheckResult;
}

async function resolveWithFallback(
  channel: Channel,
  buildReal: () => DataSource | null,
): Promise<ResolvedSource> {
  const mock = new MockDataSource(channel);
  const real = buildReal();

  if (!real) {
    const health = await mock.healthCheck();
    return { source: mock, isMock: true, configured: false, health };
  }

  try {
    const realHealth = await real.healthCheck();
    if (realHealth.ok) {
      return { source: real, isMock: false, configured: true, health: realHealth };
    }
    // Configurado, mas sem saúde → cai no mock, preservando a mensagem real.
    const mockHealth = await mock.healthCheck();
    return {
      source: mock,
      isMock: true,
      configured: true,
      health: { ...mockHealth, message: realHealth.message },
    };
  } catch (err) {
    const mockHealth = await mock.healthCheck();
    const message = err instanceof Error ? err.message : String(err);
    return {
      source: mock,
      isMock: true,
      configured: true,
      health: { ...mockHealth, message: `Falha na fonte real, usando demonstração: ${message}` },
    };
  }
}

export class DataSourceRegistry {
  /** Fonte da loja online (Shopify → fallback mock). */
  resolveOnline(): Promise<ResolvedSource> {
    return resolveWithFallback("online", () => {
      const config = readShopifyConfig();
      return config ? new ShopifyDataSource(config) : null;
    });
  }

  /** Fonte da loja física (PDV → fallback mock). */
  resolveFisica(): Promise<ResolvedSource> {
    return resolveWithFallback("fisica", () => {
      const config = readPdvConfig();
      return config ? new PdvDataSource(config) : null;
    });
  }

  /** Resolve as duas fontes de uma vez. */
  async resolveAll(): Promise<{ online: ResolvedSource; fisica: ResolvedSource }> {
    const [online, fisica] = await Promise.all([this.resolveOnline(), this.resolveFisica()]);
    return { online, fisica };
  }
}

export const registry = new DataSourceRegistry();
