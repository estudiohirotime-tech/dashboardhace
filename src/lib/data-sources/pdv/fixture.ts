// -----------------------------------------------------------------------------
// Gerador de FIXTURES do PDV (Bling) — vendas fictícias porém realistas da
// loja física. Seed fixa. Exercita o pipeline real (Zod -> mapper -> banco).
// -----------------------------------------------------------------------------

import { Rng } from "../mock/rng";
import { PRODUCTS, FIRST_NAMES, LAST_NAMES, VENDEDORES, UNIDADES, FORMAS_PAGAMENTO } from "../mock/catalog";

const SEED = "pdv-bling-fixture-2026";
const WINDOW_DAYS = 90;
const SALES_PER_DAY = 22;
const PAGE_SIZE = 100;

const SITUACOES = [
  { nome: "Atendido", weight: 0.9 },
  { nome: "Em aberto", weight: 0.06 },
  { nome: "Cancelado", weight: 0.04 },
];

// Cupons/códigos de vendedor que funcionam como ponte de atribuição com o online.
const CUPONS = ["juliana_costa", "insta15", "black20", "indica10"];

interface RawSale {
  data: string;
  raw: Record<string, unknown>;
}

let universe: RawSale[] | null = null;

function buildUniverse(): RawSale[] {
  const rng = new Rng(SEED);
  const sales: RawSale[] = [];
  const now = new Date();
  let seq = 5000;

  for (let d = WINDOW_DAYS - 1; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 86400 * 1000);
    const data = new Date(dayDate.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
    const weekday = new Date(`${data}T12:00:00-03:00`).getDay();
    const factor = weekday === 6 || weekday === 5 ? 1.25 : weekday === 1 ? 0.75 : 1.0;
    const count = Math.max(1, Math.round(SALES_PER_DAY * factor * (0.85 + rng.float() * 0.3)));

    for (let i = 0; i < count; i++) {
      const nLines = rng.weighted([1, 2, 3], [0.55, 0.32, 0.13]);
      const chosen = new Set<number>();
      while (chosen.size < nLines) chosen.add(rng.int(0, PRODUCTS.length - 1));
      // Ticket físico ~18% maior: leve viés de quantidade.
      const itens = Array.from(chosen).map((idx) => {
        const p = PRODUCTS[idx]!;
        const quantidade = rng.weighted([1, 2, 3], [0.6, 0.3, 0.1]);
        return {
          descricao: p.title,
          quantidade,
          valor: Number((p.price / 100).toFixed(2)),
          produto: { id: p.id.replace(/\D/g, "") },
        };
      });
      const total = Number(
        itens.reduce((a, it) => a + it.valor * it.quantidade, 0).toFixed(2),
      );

      const situacao = rng.weighted(
        SITUACOES.map((s) => s.nome),
        SITUACOES.map((s) => s.weight),
      );
      const hasContato = rng.chance(0.45); // muita venda de balcão é anônima
      const first = rng.pick(FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);
      const cupom = rng.chance(0.2) ? rng.pick(CUPONS) : null;

      const raw = {
        id: seq,
        numero: seq,
        data,
        total,
        situacaoNome: situacao,
        contato: hasContato
          ? { id: rng.int(1, 9000), nome: `${first} ${last}`, email: `${first}.${last}`.toLowerCase() + "@email.com" }
          : null,
        loja: { id: rng.int(1, 3), nome: rng.pick(UNIDADES) },
        vendedor: { id: rng.int(1, 6), nome: rng.pick(VENDEDORES) },
        formaPagamento: { id: rng.int(1, 4), nome: rng.pick(FORMAS_PAGAMENTO) },
        cupom,
        itens,
      };
      sales.push({ data, raw });
      seq++;
    }
  }

  sales.sort((a, b) => a.data.localeCompare(b.data));
  return sales;
}

function getUniverse(): RawSale[] {
  if (!universe) universe = buildUniverse();
  return universe;
}

export interface PdvFixturePage {
  sales: Record<string, unknown>[];
  hasNext: boolean;
}

/** Simula a paginação por número de página do Bling. */
export function getPdvFixturePage(page: number, updatedAtMin?: string | null): PdvFixturePage {
  const all = getUniverse();
  const filtered = updatedAtMin ? all.filter((s) => s.data > updatedAtMin.slice(0, 10)) : all;
  const start = (page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  return {
    sales: slice.map((s) => s.raw),
    hasNext: start + PAGE_SIZE < filtered.length,
  };
}
