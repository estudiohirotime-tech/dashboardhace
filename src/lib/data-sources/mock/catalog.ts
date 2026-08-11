// Catálogos em PT-BR para o gerador de mock (coerentes entre si).

export interface CatalogProduct {
  id: string;
  title: string;
  /** preço de referência em centavos */
  price: number;
}

export const PRODUCTS: CatalogProduct[] = [
  { id: "p-001", title: "Tênis Corrida AeroLeve", price: 34990 },
  { id: "p-002", title: "Camiseta Dry-Fit Preta", price: 8990 },
  { id: "p-003", title: "Legging Compressão Flex", price: 12990 },
  { id: "p-004", title: "Garrafa Térmica 750ml", price: 6490 },
  { id: "p-005", title: "Mochila Urbana 20L", price: 19990 },
  { id: "p-006", title: "Boné Trucker Logo", price: 4990 },
  { id: "p-007", title: "Jaqueta Corta-Vento Azul", price: 27990 },
  { id: "p-008", title: "Meia Cano Alto (kit 3)", price: 3990 },
  { id: "p-009", title: "Shorts Treino Masculino", price: 9990 },
  { id: "p-010", title: "Top Fitness Sustentação", price: 8490 },
  { id: "p-011", title: "Relógio Esportivo Pulse", price: 89900 },
  { id: "p-012", title: "Whey Protein 900g Baunilha", price: 15990 },
  { id: "p-013", title: "Faixa Elástica (kit 5)", price: 5990 },
  { id: "p-014", title: "Luva de Treino EVA", price: 7490 },
  { id: "p-015", title: "Corda de Pular Speed", price: 4490 },
  { id: "p-016", title: "Tênis Casual UrbanStep", price: 29990 },
  { id: "p-017", title: "Moletom Canguru Cinza", price: 17990 },
  { id: "p-018", title: "Squeeze Automático 500ml", price: 3490 },
  { id: "p-019", title: "Kit Elásticos + Bolsa", price: 8990 },
  { id: "p-020", title: "Óculos Esportivo Polarizado", price: 22990 },
];

export const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Larissa", "Marcos", "Natália", "Otávio", "Paula", "Rafael",
  "Sofia", "Thiago", "Vanessa", "Wesley", "Camila", "Lucas", "Beatriz", "Gustavo",
];

export const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa", "Almeida",
  "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo", "Barbosa", "Ribeiro", "Carvalho",
];

export const EMAIL_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "icloud.com"];

export const VENDEDORES = ["Marina", "Rodrigo", "Patrícia", "Fernando", "Juliana", "Caio"];

export const UNIDADES = ["Loja Centro", "Loja Shopping Norte", "Loja Praia"];

export const FORMAS_PAGAMENTO = ["Crédito", "Débito", "Pix", "Dinheiro"];

// Campanhas por grupo de canal — dão sentido ao filtro de funil por campanha.
export const CAMPAIGNS: Record<string, { source: string; medium: string; campaigns: string[] }> = {
  paid_social: {
    source: "instagram",
    medium: "paid_social",
    campaigns: ["verao-2026", "remarketing-carrinho", "lancamento-tenis", "prospeccao-lookalike"],
  },
  paid_search: {
    source: "google",
    medium: "cpc",
    campaigns: ["search-marca", "search-generico-tenis", "search-shopping"],
  },
  email: {
    source: "rd-station",
    medium: "email",
    campaigns: ["boas-vindas", "recuperacao-carrinho", "newsletter-semanal"],
  },
  organic_social: {
    source: "instagram",
    medium: "social",
    campaigns: ["bio-link", "stories-organico"],
  },
  organic_search: {
    source: "google",
    medium: "organic",
    campaigns: ["organico"],
  },
  direct: {
    source: "",
    medium: "",
    campaigns: ["(direto)"],
  },
};
