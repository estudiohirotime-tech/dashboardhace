// -----------------------------------------------------------------------------
// Cliente da Admin API GraphQL da Shopify.
// - Paginação por cursor (pageInfo.hasNextPage / endCursor).
// - Rate limit por CUSTO de query (bucket): retry com backoff ao receber THROTTLED.
// - Modo fixture: quando SHOPIFY_FIXTURE=1, responde com payloads fictícios
//   (sem rede), exercitando todo o pipeline real de parsing/validação.
// -----------------------------------------------------------------------------

import { ordersQueryResponseSchema, type OrdersQueryResponse } from "./schemas";
import type { ShopifyConfig } from "./config";
import { getFixturePage } from "./fixture";

const ORDERS_QUERY = /* GraphQL */ `
query Orders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
    edges {
      cursor
      node {
        id
        name
        createdAt
        updatedAt
        displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        landingPageUrl
        referrerUrl
        note
        customAttributes { key value }
        customerJourneySummary {
          ready
          momentsCount
          firstVisit { occurredAt landingPage referrerUrl source sourceType utmParameters { source medium campaign content term } }
          lastVisit  { occurredAt landingPage referrerUrl source sourceType utmParameters { source medium campaign content term } }
        }
        customer { id firstName lastName email numberOfOrders }
        app { name }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              product { id }
              originalUnitPriceSet { shopMoney { amount currencyCode } }
              originalTotalSet { shopMoney { amount currencyCode } }
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

export interface FetchOrdersParams {
  first?: number;
  after?: string | null;
  updatedAtMin?: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isThrottled(res: OrdersQueryResponse): boolean {
  return Boolean(
    res.errors?.some(
      (e) => (e.extensions as { code?: string } | undefined)?.code === "THROTTLED",
    ),
  );
}

export class ShopifyGraphQLClient {
  constructor(private readonly config: ShopifyConfig) {}

  private endpoint(): string {
    return `https://${this.config.storeDomain}/admin/api/${this.config.apiVersion}/graphql.json`;
  }

  private buildQueryFilter(updatedAtMin?: string | null): string | null {
    return updatedAtMin ? `updated_at:>'${updatedAtMin}'` : null;
  }

  /** Busca uma página de pedidos, com retry/backoff em THROTTLED. */
  async fetchOrdersPage(params: FetchOrdersParams): Promise<OrdersQueryResponse> {
    const variables = {
      first: params.first ?? 100,
      after: params.after ?? null,
      query: this.buildQueryFilter(params.updatedAtMin),
    };

    // Modo fixture: sem rede.
    if (this.config.fixture) {
      const raw = getFixturePage(variables);
      return ordersQueryResponseSchema.parse(raw);
    }

    const backoffs = [2000, 4000, 8000, 16000];
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await fetch(this.endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.config.accessToken,
        },
        body: JSON.stringify({ query: ORDERS_QUERY, variables }),
      });

      if (response.status === 429 && attempt < backoffs.length) {
        await sleep(backoffs[attempt]!);
        attempt++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Shopify GraphQL HTTP ${response.status}`);
      }

      const json = ordersQueryResponseSchema.parse(await response.json());

      if (isThrottled(json) && attempt < backoffs.length) {
        await sleep(backoffs[attempt]!);
        attempt++;
        continue;
      }

      if (json.errors && json.errors.length > 0 && !json.data) {
        throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join("; ")}`);
      }

      return json;
    }
  }

  /** Health check: uma página mínima. */
  async ping(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await this.fetchOrdersPage({ first: 1 });
      if (res.data?.orders) {
        return { ok: true, message: "Shopify conectada." };
      }
      return { ok: false, message: "Resposta inesperada da Shopify." };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }
}
