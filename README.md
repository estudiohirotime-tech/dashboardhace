# Dashboard de Vendas Omnichannel

Dashboard analítico que unifica vendas da **loja online (Shopify)** e da **loja física (PDV/ERP)** numa única tela.

Arquitetura orientada a **adapters**: toda a UI consome uma interface única (`DataSource`); nunca a Shopify/PDV diretamente. Sem credenciais, cada fonte cai automaticamente em **modo demonstração (mock)**, de forma independente.

## Status por fase

- [x] **Fase 1** — Setup, schema Prisma, tipos, `MockDataSource` completo, `.env.example`, agrupamento de canal + parser de UTM com testes.
- [ ] **Fase 2** — UI completa em mock (todas as rotas e estados).
- [ ] **Fase 3** — `ShopifyDataSource` (Admin API GraphQL, backfill, parser de UTM).
- [ ] **Fase 4** — Webhooks Shopify, fila e sincronização incremental.
- [ ] **Fase 5** — `PdvDataSource` da loja física.
- [ ] **Fase 6** — Web Pixels Extension e funil completo com eventos reais.
- [ ] **Fase 7** — Exportação CSV, seletor de modelo de atribuição e polimento.

## Rodando localmente

```bash
npm install
cp .env.example .env          # opcional — sobe 100% em mock sem nada preenchido
npm run db:push               # cria o SQLite local (dev.db)
npm run db:seed               # opcional: popula o banco com mock (valida o schema)
npm run dev                   # http://localhost:3000
```

Sem nenhuma variável de ambiente, a aplicação sobe e renderiza todas as telas em modo demonstração.

## Scripts

| Script | O quê |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` (modo estrito) |
| `npm run test` | Vitest (channel-grouping + utm-parser) |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma |

## Arquitetura de dados

```
src/lib/data-sources/
  types.ts              # o contrato: Order, Attribution, FunnelSnapshot, DataSource...
  registry.ts           # decide adapter por origem + fallback automático p/ mock
  channel-grouping.ts   # ChannelGroup (fonte única) + testes
  utm-parser.ts         # parser de UTM em cascata + testes
  partners.json         # lista editável de parceiros/influenciadores
  mock/                 # MockDataSource + gerador realista (seed fixa)
  shopify/              # ShopifyDataSource (stub na Fase 1)
  pdv/                  # PdvDataSource (stub na Fase 1)
```

**Regra de ouro:** todo valor monetário trafega em **centavos (inteiro)**; formatação só na borda da UI (`src/lib/format.ts`).

## Ressalvas técnicas importantes (a tratar nas próximas fases)

- **`read_orders` cobre só os últimos 60 dias.** Histórico completo exige `read_all_orders`, que precisa de aprovação da Shopify. Fallback: importação inicial via CSV do admin. (Fase 3)
- **`customerJourneySummary` (atribuição de 1º clique) depende do plano da loja.** Só dá para confirmar batendo na API real; se indisponível, degrada para último clique via `landingPageUrl` + `referrerUrl` e sinaliza na UI. (Fase 3)
- **Funil real exige fonte de comportamento** — a Admin API só entrega pedidos. Começamos pela Opção C (só pedidos), com UI/schema já prontos para as 6 etapas via mock; a Web Pixels Extension (Opção A) entra na Fase 6.

## Banco

SQLite em desenvolvimento (`provider = "sqlite"` em `prisma/schema.prisma`). Para produção, troque para `postgresql` e aponte `DATABASE_URL`.
