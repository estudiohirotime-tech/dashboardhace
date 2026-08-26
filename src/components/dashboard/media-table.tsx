"use client";

import { Film, Image as ImageIcon, Images as CarouselIcon, Video, Heart, MessageCircle, Bookmark, Eye } from "lucide-react";
import { Card, CardTitle, DemoBadge, Skeleton, Badge } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useIgTopMedia, useIgRecentMedia } from "@/hooks/use-ig";
import type { MediaItem, MediaType } from "@/lib/instagram/types";
import { formatNumberCompact, formatPercent } from "@/lib/format";
import { formatDate } from "@/lib/date";

const TYPE_META: Record<MediaType, { label: string; icon: typeof Film }> = {
  REELS: { label: "Reels", icon: Film },
  IMAGE: { label: "Foto", icon: ImageIcon },
  CAROUSEL_ALBUM: { label: "Carrossel", icon: CarouselIcon },
  VIDEO: { label: "Vídeo", icon: Video },
  STORY: { label: "Story", icon: ImageIcon },
};

function Thumb({ item }: { item: MediaItem }) {
  const Icon = TYPE_META[item.type].icon;
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
    >
      <Icon size={16} />
    </span>
  );
}

export function MediaTable({ variant = "top", title }: { variant?: "top" | "recent"; title?: string }) {
  const top = useIgTopMedia(10);
  const recent = useIgRecentMedia(12);
  const q = variant === "top" ? top : recent;
  const items = q.data?.items ?? [];
  const heading = title ?? (variant === "top" ? "Top conteúdos por engajamento" : "Publicações recentes");

  return (
    <Card className="flex flex-col">
      <div className="mb-4 flex items-center gap-2">
        <CardTitle className="text-base">{heading}</CardTitle>
        {q.data?.isMock && <DemoBadge />}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState message="Nenhuma publicação neste período. Amplie o intervalo." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                <th className="pb-2 font-medium">Publicação</th>
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 text-right font-medium"><Heart size={13} className="ml-auto" /></th>
                <th className="pb-2 text-right font-medium"><MessageCircle size={13} className="ml-auto" /></th>
                <th className="pb-2 text-right font-medium"><Bookmark size={13} className="ml-auto" /></th>
                <th className="pb-2 text-right font-medium"><Eye size={13} className="ml-auto" /></th>
                <th className="pb-2 text-right font-medium">Engaj.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="py-2.5">
                    <span className="flex items-center gap-3">
                      <Thumb item={m} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <Badge tone="muted" className="text-[10px]">{TYPE_META[m.type].label}</Badge>
                        </span>
                        <span className="mt-0.5 block max-w-[280px] truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                          {m.caption ?? "—"}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5" style={{ color: "var(--text-muted)" }}>{formatDate(m.timestamp)}</td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-primary)" }}>{formatNumberCompact(m.likes)}</td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>{formatNumberCompact(m.comments)}</td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>{formatNumberCompact(m.saves)}</td>
                  <td className="py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>{formatNumberCompact(m.views)}</td>
                  <td className="py-2.5 text-right">
                    <Badge tone="accent" className="font-mono">{formatPercent(m.engagementRate)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
