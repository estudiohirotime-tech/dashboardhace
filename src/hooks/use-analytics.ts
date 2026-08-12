"use client";

import { useQuery } from "@tanstack/react-query";
import { usePeriod } from "./use-period";
import type {
  Overview,
  RevenueTimeseries,
  ChannelSplit,
  CustomerStats,
  Granularity,
  SourceMeta,
} from "@/lib/services/analytics";
import type { FunnelSnapshot, AttributionRow, ProductRow, Order } from "@/lib/data-sources/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`);
  return res.json() as Promise<T>;
}

export function useOverview() {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["overview", periodQuery],
    queryFn: () => fetchJson<Overview>(`/api/overview?${periodQuery}`),
  });
}

export function useTimeseries(granularity: Granularity) {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["timeseries", periodQuery, granularity],
    queryFn: () =>
      fetchJson<RevenueTimeseries>(`/api/timeseries?${periodQuery}&granularity=${granularity}`),
  });
}

export function useChannelSplit() {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["channel-split", periodQuery],
    queryFn: () => fetchJson<ChannelSplit>(`/api/channel-split?${periodQuery}`),
  });
}

export function useCustomerStats() {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["customers", periodQuery],
    queryFn: () => fetchJson<CustomerStats>(`/api/customers?${periodQuery}`),
  });
}

export function useFunnel(extra?: Record<string, string | undefined>) {
  const { periodQuery } = usePeriod();
  const sp = new URLSearchParams(periodQuery);
  for (const [k, v] of Object.entries(extra ?? {})) if (v) sp.set(k, v);
  const qs = sp.toString();
  return useQuery({
    queryKey: ["funnel", qs],
    queryFn: () => fetchJson<FunnelSnapshot>(`/api/funnel?${qs}`),
  });
}

export function useAttribution() {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["attribution", periodQuery],
    queryFn: () => fetchJson<{ rows: AttributionRow[]; isMock: boolean }>(`/api/attribution?${periodQuery}`),
  });
}

export function useProducts() {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["products", periodQuery],
    queryFn: () => fetchJson<{ rows: ProductRow[]; isMock: boolean }>(`/api/products?${periodQuery}`),
  });
}

export function useOrders(extra?: Record<string, string | undefined>) {
  const { periodQuery } = usePeriod();
  const sp = new URLSearchParams(periodQuery);
  for (const [k, v] of Object.entries(extra ?? {})) if (v) sp.set(k, v);
  const qs = sp.toString();
  return useQuery({
    queryKey: ["orders", qs],
    queryFn: () => fetchJson<{ orders: Order[]; isMock: boolean }>(`/api/orders?${qs}`),
  });
}

export function useRecentOrders() {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["recent", periodQuery],
    queryFn: () => fetchJson<{ orders: Order[]; isMock: boolean }>(`/api/recent?${periodQuery}`),
    refetchInterval: 20_000, // painel "tempo real" via revalidação
  });
}

export function useSourceMeta() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => fetchJson<SourceMeta>(`/api/health`),
    refetchInterval: 60_000,
  });
}
