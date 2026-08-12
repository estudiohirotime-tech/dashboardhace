import * as React from "react";
import { cn } from "@/lib/utils";

// --- Card ---------------------------------------------------------------------

export function Card({
  className,
  highlight,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[16px] border p-6",
        highlight ? "highlight-card" : "bg-surface",
        className,
      )}
      style={
        highlight
          ? undefined
          : { background: "var(--bg-surface)", borderColor: "var(--border)" }
      }
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-[18px] font-semibold", className)}
      style={{ color: "var(--text-primary)" }}
      {...props}
    />
  );
}

export function SectionLabel({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("label-caps", className)} {...props} />;
}

// --- Badge --------------------------------------------------------------------

type BadgeTone = "accent" | "positive" | "negative" | "warning" | "muted";

const BADGE_STYLES: Record<BadgeTone, React.CSSProperties> = {
  accent: { background: "var(--accent-soft)", color: "var(--accent-bright)" },
  positive: { background: "rgba(52,211,153,0.12)", color: "var(--positive)" },
  negative: { background: "rgba(248,113,113,0.12)", color: "var(--negative)" },
  warning: { background: "rgba(251,191,36,0.12)", color: "var(--warning)" },
  muted: { background: "var(--bg-inset)", color: "var(--text-secondary)" },
};

export function Badge({
  tone = "accent",
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ ...BADGE_STYLES[tone], ...style }}
      {...props}
    />
  );
}

/** Badge persistente de dados fictícios. Requisito: nunca mostrar número mock sem isto. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="accent" className={className} title="Este bloco usa dados de demonstração">
      Dados de demonstração
    </Badge>
  );
}

// --- Skeleton -----------------------------------------------------------------

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

// --- Button -------------------------------------------------------------------

type ButtonVariant = "primary" | "ghost" | "outline";

export function Button({
  variant = "outline",
  className,
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const styles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "#fff" },
    ghost: { background: "transparent", color: "var(--text-secondary)" },
    outline: {
      background: "var(--bg-inset)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-strong)",
    },
  };
  return <button className={cn(base, className)} style={{ ...styles[variant], ...style }} {...props} />;
}
