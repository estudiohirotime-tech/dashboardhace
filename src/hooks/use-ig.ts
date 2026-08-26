"use client";

import { useQuery } from "@tanstack/react-query";
import { usePeriod } from "./use-period";
import type {
  Overview,
  FollowerGrowth,
  ReachTimeseries,
  MediaList,
  AudienceDemographics,
  Granularity,
} from "@/lib/instagram/types";
import type { InstagramMeta } from "@/lib/instagram/registry";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`);
  return res.json() as Promise<T>;
}

export function useIgOverview() {
  const { periodQuery } = usePeriod();
  return useQuery({ queryKey: ["ig-overview", periodQuery], queryFn: () => fetchJson<Overview>(`/api/ig/overview?${periodQuery}`) });
}

export function useIgFollowers(granularity: Granularity) {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["ig-followers", periodQuery, granularity],
    queryFn: () => fetchJson<FollowerGrowth>(`/api/ig/followers?${periodQuery}&granularity=${granularity}`),
  });
}

export function useIgReach(granularity: Granularity) {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["ig-reach", periodQuery, granularity],
    queryFn: () => fetchJson<ReachTimeseries>(`/api/ig/reach?${periodQuery}&granularity=${granularity}`),
  });
}

export function useIgTopMedia(limit = 10) {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["ig-top-media", periodQuery, limit],
    queryFn: () => fetchJson<MediaList>(`/api/ig/top-media?${periodQuery}&limit=${limit}`),
  });
}

export function useIgRecentMedia(limit = 12) {
  const { periodQuery } = usePeriod();
  return useQuery({
    queryKey: ["ig-recent-media", periodQuery, limit],
    queryFn: () => fetchJson<MediaList>(`/api/ig/recent-media?${periodQuery}&limit=${limit}`),
  });
}

export function useIgAudience() {
  return useQuery({ queryKey: ["ig-audience"], queryFn: () => fetchJson<AudienceDemographics>(`/api/ig/audience`) });
}

export function useIgMeta() {
  return useQuery({ queryKey: ["ig-health"], queryFn: () => fetchJson<InstagramMeta>(`/api/ig/health`), refetchInterval: 60_000 });
}
