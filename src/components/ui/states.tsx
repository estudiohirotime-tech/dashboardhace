import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Inbox, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "./primitives";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[16px] border p-8 text-center"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

/** Estado vazio: diz o que fazer, não só que não há dados. */
export function EmptyState({
  title = "Nenhum dado neste período",
  message = "Amplie o intervalo de datas ou verifique a conexão com as fontes.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Frame>
      <Inbox size={28} style={{ color: "var(--text-muted)" }} />
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </div>
      <div className="max-w-sm text-sm" style={{ color: "var(--text-secondary)" }}>
        {message}
      </div>
    </Frame>
  );
}

/** Estado de erro: o que falhou + ação de recuperação. Sem desculpas. */
export function ErrorState({
  message = "Não foi possível carregar este bloco.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Frame>
      <AlertTriangle size={28} style={{ color: "var(--negative)" }} />
      <div className="max-w-sm text-sm" style={{ color: "var(--text-primary)" }}>
        {message}
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw size={14} /> Tentar novamente
        </Button>
      )}
    </Frame>
  );
}

/** Estado sem credencial: qual variável falta + link para configurações. */
export function NoCredentialState({
  source,
  envVar,
}: {
  source: string;
  envVar: string;
}) {
  return (
    <Frame>
      <KeyRound size={28} style={{ color: "var(--warning)" }} />
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {source} sem credencial
      </div>
      <div className="max-w-sm text-sm" style={{ color: "var(--text-secondary)" }}>
        Falta configurar <code style={{ color: "var(--accent-bright)" }}>{envVar}</code>. Enquanto
        isso, esta fonte roda em modo demonstração.
      </div>
      <Link href="/configuracoes">
        <Button variant="outline">Ir para configurações</Button>
      </Link>
    </Frame>
  );
}
