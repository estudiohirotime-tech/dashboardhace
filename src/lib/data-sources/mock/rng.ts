// PRNG determinístico — seed fixa, para que os números não mudem a cada refresh.

/** Hash de string -> uint32 (xmur3). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Gerador uniforme [0,1) (mulberry32). */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;

  constructor(seed: string) {
    const s = xmur3(seed);
    this.next = mulberry32(s());
  }

  /** Uniforme [0,1). */
  float(): number {
    return this.next();
  }

  /** Inteiro em [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Elemento aleatório de um array. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** Escolha ponderada: índices com pesos (não precisam somar 1). */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return items[i]!;
    }
    return items[items.length - 1]!;
  }

  /** true com probabilidade p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Amostra normal padrão (Box-Muller). */
  gaussian(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Amostra log-normal em centavos, dado mediana (reais) e sigma. */
  logNormalCents(medianReais: number, sigma: number): number {
    const mu = Math.log(medianReais);
    const value = Math.exp(mu + sigma * this.gaussian());
    return Math.max(100, Math.round(value * 100));
  }
}
