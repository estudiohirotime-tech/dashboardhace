// -----------------------------------------------------------------------------
// Formatação de dados — SÓ na borda da UI.
// Valores chegam sempre em centavos (inteiro) e viram string aqui.
// -----------------------------------------------------------------------------

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUM = new Intl.NumberFormat("pt-BR");

/** Centavos -> "R$ 3.131.021,00" */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100);
}

/**
 * Centavos -> forma compacta para cards: "R$ 3,13 mi", "R$ 18,2 mil".
 * Abaixo de mil reais, cai no formato completo.
 */
export function formatBRLCompact(cents: number): string {
  const reais = cents / 100;
  const abs = Math.abs(reais);
  if (abs >= 1_000_000) {
    return `R$ ${formatDecimal(reais / 1_000_000, 2)} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${formatDecimal(reais / 1_000, 1)} mil`;
  }
  return BRL.format(reais);
}

/** Número compacto sem moeda: "18,2 mil", "1,3 mi". */
export function formatNumberCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${formatDecimal(value / 1_000_000, 2)} mi`;
  if (abs >= 1_000) return `${formatDecimal(value / 1_000, 1)} mil`;
  return NUM.format(value);
}

/** Inteiro com separador de milhar brasileiro. */
export function formatInt(value: number): string {
  return NUM.format(Math.round(value));
}

/** Número com N casas decimais no padrão brasileiro. */
export function formatDecimal(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Fração 0..1 -> "42,0%" (uma casa por padrão). */
export function formatPercent(fraction: number, fractionDigits = 1): string {
  return `${formatDecimal(fraction * 100, fractionDigits)}%`;
}

/** Variação com sinal e seta: "+12,4%" / "-3,1%". */
export function formatDelta(fraction: number, fractionDigits = 1): string {
  const sign = fraction > 0 ? "+" : fraction < 0 ? "" : "";
  return `${sign}${formatDecimal(fraction * 100, fractionDigits)}%`;
}

/** Variação percentual entre dois valores (0 anterior é tratado como 100% se cresceu). */
export function computeDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / previous;
}
