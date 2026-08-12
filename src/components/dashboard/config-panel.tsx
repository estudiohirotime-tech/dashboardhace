"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAttributionModel, setAttributionModel } from "@/hooks/use-attribution-model";
import { RefreshCw, Plus, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardTitle, Badge, Button, Skeleton } from "@/components/ui/primitives";
import { useSourceMeta } from "@/hooks/use-analytics";
import type { ConnectionStatus } from "@/lib/data-sources/types";

const STATUS: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: "var(--positive)", label: "Conectado e sincronizado" },
  delayed: { color: "var(--warning)", label: "Atraso na sincronização" },
  demo: { color: "var(--text-muted)", label: "Modo demonstração" },
};

// --- Conexões -----------------------------------------------------------------

function ConnectionCard({
  title,
  envVars,
  status,
  message,
  configured,
}: {
  title: string;
  envVars: string[];
  status: ConnectionStatus;
  message: string;
  configured: boolean;
}) {
  const meta = STATUS[status];
  return (
    <div className="rounded-[12px] border p-4" style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{title}</span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{message}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {envVars.map((v) => (
          <code
            key={v}
            className="rounded-[6px] px-1.5 py-0.5 text-[11px]"
            style={{ background: "var(--bg-surface)", color: configured ? "var(--positive)" : "var(--warning)" }}
          >
            {v}
          </code>
        ))}
      </div>
    </div>
  );
}

// --- Parceiros ----------------------------------------------------------------

interface PartnersFile {
  influencers: string[];
  affiliates: string[];
}

function PartnersManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const r = await fetch("/api/partners");
      if (!r.ok) throw new Error("Falha ao carregar parceiros");
      return (await r.json()) as PartnersFile;
    },
  });

  const [source, setSource] = useState("");
  const [kind, setKind] = useState<"influencer" | "affiliate">("influencer");

  const mutate = useMutation({
    mutationFn: async (payload: { source: string; kind: string; remove?: boolean }) => {
      const r = await fetch("/api/partners", {
        method: payload.remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: payload.source, kind: payload.kind }),
      });
      if (!r.ok) throw new Error("Falha ao salvar");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["attribution"] });
      setSource("");
    },
  });

  const chip = (value: string, k: "influencer" | "affiliate") => (
    <span
      key={`${k}-${value}`}
      className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs"
      style={{ background: "var(--bg-inset)", color: "var(--text-secondary)" }}
    >
      {value}
      <button
        onClick={() => mutate.mutate({ source: value, kind: k, remove: true })}
        aria-label={`Remover ${value}`}
        style={{ color: "var(--text-muted)" }}
      >
        <X size={12} />
      </button>
    </span>
  );

  return (
    <Card>
      <CardTitle className="text-base">Parceiros e influenciadores</CardTitle>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Um <code style={{ color: "var(--accent-bright)" }}>utm_source</code> cadastrado aqui é
        classificado como <strong>Influenciador</strong> no agrupamento de canal.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label className="label-caps">utm_source</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="ex: juliana_costa"
            className="rounded-[10px] border px-3 py-2 text-sm"
            style={{ background: "var(--bg-inset)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "influencer" | "affiliate")}
          className="rounded-[10px] border px-3 py-2 text-sm"
          style={{ background: "var(--bg-inset)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
        >
          <option value="influencer">Influenciador</option>
          <option value="affiliate">Afiliado</option>
        </select>
        <Button
          variant="primary"
          disabled={!source.trim() || mutate.isPending}
          onClick={() => mutate.mutate({ source: source.trim(), kind })}
        >
          <Plus size={15} /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-16 w-full" />
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 label-caps">Influenciadores</div>
            <div className="flex flex-wrap gap-1.5">
              {data?.influencers.length ? data.influencers.map((s) => chip(s, "influencer")) : (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhum cadastrado.</span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-1.5 label-caps">Afiliados</div>
            <div className="flex flex-wrap gap-1.5">
              {data?.affiliates.length ? data.affiliates.map((s) => chip(s, "affiliate")) : (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhum cadastrado.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// --- Modelo de atribuição -----------------------------------------------------

function AttributionModel() {
  const model = useAttributionModel();

  function choose(m: "first_click" | "last_click") {
    setAttributionModel(m);
  }

  const options: { key: "first_click" | "last_click"; label: string; desc: string }[] = [
    { key: "last_click", label: "Último clique", desc: "Crédito à última origem antes da compra. Disponível hoje." },
    { key: "first_click", label: "Primeiro clique", desc: "Crédito à origem que iniciou a jornada. Requer customerJourneySummary (Fase 3)." },
  ];

  return (
    <Card>
      <CardTitle className="text-base">Modelo de atribuição</CardTitle>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Define como o crédito da venda é distribuído entre os pontos de contato. A aplicação efetiva
        ao cálculo entra na Fase 7.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = model === o.key;
          return (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              className="rounded-[12px] border p-4 text-left"
              style={{
                background: active ? "var(--accent-soft)" : "var(--bg-inset)",
                borderColor: active ? "var(--accent)" : "var(--border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{o.label}</span>
                {active && <CheckCircle2 size={16} style={{ color: "var(--accent-bright)" }} />}
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{o.desc}</p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// --- Painel ------------------------------------------------------------------

export function ConfigPanel() {
  const { data, isFetching, refetch } = useSourceMeta();

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle className="text-base">Status das conexões</CardTitle>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Testar credenciais
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ConnectionCard
            title="Loja online — Shopify"
            envVars={["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN", "SHOPIFY_WEBHOOK_SECRET"]}
            status={data?.online.status ?? "demo"}
            message={data?.online.message ?? "Carregando..."}
            configured={data?.online.configured ?? false}
          />
          <ConnectionCard
            title="Loja física — PDV/ERP"
            envVars={["PDV_SYSTEM", "PDV_API_BASE_URL", "PDV_API_KEY"]}
            status={data?.fisica.status ?? "demo"}
            message={data?.fisica.message ?? "Carregando..."}
            configured={data?.fisica.configured ?? false}
          />
        </div>
        {data?.anyMock && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <AlertCircle size={14} style={{ color: "var(--warning)" }} />
            Ao menos uma fonte está em modo demonstração. Os números exibidos são fictícios enquanto
            as credenciais não forem configuradas.
          </div>
        )}
      </Card>

      <PartnersManager />
      <AttributionModel />
    </div>
  );
}
