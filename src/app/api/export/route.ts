import { NextRequest } from "next/server";
import { getOrders } from "@/lib/services/analytics";
import { rangeFromRequest, filtersFromRequest } from "@/lib/api-request";
import { channelGroupLabel, CHANNEL_LABELS, FINANCIAL_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/date";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const { orders } = await getOrders(rangeFromRequest(req), filtersFromRequest(req));

  const header = [
    "id",
    "data",
    "canal",
    "origem",
    "campanha",
    "utm_source",
    "utm_medium",
    "cliente",
    "email",
    "itens",
    "total_reais",
    "status",
    "vendedor",
    "unidade",
    "forma_pagamento",
  ];

  const rows = orders.map((o) =>
    [
      o.id,
      formatDateTime(o.createdAt),
      CHANNEL_LABELS[o.channel],
      channelGroupLabel(o.attribution.channelGroup),
      o.attribution.utmCampaign ?? "",
      o.attribution.utmSource ?? "",
      o.attribution.utmMedium ?? "",
      o.customer.name ?? "",
      o.customer.email ?? "",
      o.itemsCount,
      (o.total / 100).toFixed(2).replace(".", ","),
      FINANCIAL_LABELS[o.financialStatus],
      o.vendedor ?? "",
      o.unidade ?? "",
      o.formaPagamento ?? "",
    ]
      .map(csvCell)
      .join(";"),
  );

  // BOM para acentos abrirem certo no Excel-BR; separador ";".
  const csv = "﻿" + [header.join(";"), ...rows].join("\n");
  const filename = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
