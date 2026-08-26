"use client";

import { RefreshCw, CheckCircle2, AlertCircle, Instagram } from "lucide-react";
import { Card, CardTitle, Button, Badge } from "@/components/ui/primitives";
import { useIgMeta } from "@/hooks/use-ig";

const ENV_VARS = [
  { key: "META_APP_ID", desc: "App ID do app criado em developers.facebook.com" },
  { key: "META_APP_SECRET", desc: "App Secret do mesmo app (mantido só no servidor)" },
  { key: "IG_USER_ID", desc: "ID da conta profissional do Instagram (IG User ID)" },
  { key: "IG_ACCESS_TOKEN", desc: "Token de acesso de longa duração (~60 dias, renovável)" },
];

export function IgConfig() {
  const { data, isFetching, refetch } = useIgMeta();
  const status = data?.status ?? "demo";
  const connected = status === "connected";

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle className="text-base">Conexão com o Instagram</CardTitle>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Testar conexão
          </Button>
        </div>

        <div className="flex items-start gap-3 rounded-[12px] border p-4" style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}>
            <Instagram size={18} />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                {connected ? `Conectado ${data?.username ? "· @" + data.username : ""}` : "Modo demonstração"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: connected ? "var(--positive)" : "var(--text-muted)" }} />
                {connected ? "ao vivo" : "dados fictícios"}
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{data?.message ?? "Carregando..."}</p>
          </div>
        </div>

        {!connected && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <AlertCircle size={14} style={{ color: "var(--warning)" }} />
            Enquanto não houver token válido, os números são fictícios e marcados como demonstração.
          </div>
        )}
      </Card>

      <Card>
        <CardTitle className="text-base">Como conectar sua conta</CardTitle>
        <ol className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>1. Conta do Instagram precisa ser <strong>Business/Creator</strong> e estar ligada a uma <strong>Página do Facebook</strong>.</li>
          <li>2. Crie um app em <code style={{ color: "var(--accent-bright)" }}>developers.facebook.com</code> e adicione o produto <em>Instagram Graph API</em>.</li>
          <li>3. Autorize (OAuth) as permissões <code style={{ color: "var(--accent-bright)" }}>instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement</code> e gere um <strong>token de longa duração</strong>.</li>
          <li>4. Preencha as variáveis abaixo no ambiente (Railway → Variables) e teste a conexão.</li>
        </ol>

        <div className="mt-4 space-y-2">
          {ENV_VARS.map((v) => (
            <div key={v.key} className="flex items-start justify-between gap-3 rounded-[10px] border p-3" style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}>
              <div>
                <code className="text-xs" style={{ color: connected ? "var(--positive)" : "var(--warning)" }}>{v.key}</code>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{v.desc}</p>
              </div>
              {connected ? <CheckCircle2 size={16} style={{ color: "var(--positive)" }} /> : <Badge tone="warning" className="text-[10px]">pendente</Badge>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Os segredos ficam só no servidor — nenhuma credencial vai para o navegador. Para modo demo,
          use <code style={{ color: "var(--accent-bright)" }}>IG_FIXTURE=1</code>.
        </p>
      </Card>
    </div>
  );
}
