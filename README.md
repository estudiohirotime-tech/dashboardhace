# Dashboard de Vendas Omnichannel

Dashboard analítico que unifica vendas da **loja online (Shopify)** e da **loja física (PDV/ERP)** numa única tela.

Arquitetura orientada a **adapters**: toda a UI consome uma interface única (`DataSource`); nunca a Shopify/PDV diretamente. Sem credenciais, cada fonte cai automaticamente em **modo demonstração (mock)**, de forma independente.

## Status por fase

- [x] **Fase 1** — Setup, schema Prisma, tipos, `MockDataSource` completo, `.env.example`, agrupamento de canal + parser de UTM com testes.
- [x] **Fase 2** — UI completa em mock (todas as rotas e estados).
- [x] **Fase 3** — `ShopifyDataSource` (Admin API GraphQL, backfill por cursor, parser de UTM aplicado aos pedidos, agrupamento de canal, validação Zod, persistência local). Modo **fixture** para demonstração sem credenciais.
- [x] **Fase 4** — Webhooks Shopify (validação HMAC, fila em processo, upsert incremental) + simulador de entrega assinada.
- [x] **Fase 5** — `PdvDataSource` da loja física (mapper isolado por sistema; **Bling** implementado) com backfill, persistência e ponte de atribuição por cupom. Modo **fixture** para demonstração sem credenciais.
- [x] **Fase 6** — Web Pixels Extension + funil completo (6 etapas) a partir de **eventos reais** de comportamento (`FunnelEvent`), filtrável por campanha; fallback para o estimado quando não há eventos.
- [ ] **Fase 7** — Seletor de modelo de atribuição aplicado, ROI por campanha e polimento.

## Rodando localmente

```bash
npm install
cp .env.example .env          # opcional — sobe 100% em mock sem nada preenchido
npm run db:push               # cria o SQLite local (dev.db)
npm run db:seed               # opcional: popula o banco com mock (valida o schema)
npm run dev                   # http://localhost:3000
```

Sem nenhuma variável de ambiente, a aplicação sobe e renderiza todas as telas em modo demonstração.

### Modo fictício da Shopify (demonstração sem credenciais)

Com `SHOPIFY_FIXTURE=1`, a loja online fica **"conectada"** e alimenta o **pipeline real**
(validação Zod → mapper de UTM → agrupamento de canal → banco) com payloads Shopify
fictícios, sem rede nem token. Útil para ver a arquitetura funcionando ponta a ponta.

```bash
echo 'SHOPIFY_FIXTURE=1' >> .env
npm run db:push
npm run sync:shopify -- --full   # backfill fictício -> banco (~3s, ~4k pedidos)
npm run dev
```

O backfill também roda sozinho na primeira leitura (lazy). Para dados reais, deixe
`SHOPIFY_FIXTURE` vazio e preencha `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_ADMIN_ACCESS_TOKEN`.

### Webhooks (sincronização em tempo real)

Endpoint: `POST /api/webhooks/shopify`. Valida o HMAC (`SHOPIFY_WEBHOOK_SECRET`),
responde 200 rápido e processa em fila os tópicos `orders/create`, `orders/updated`,
`orders/paid`, `orders/cancelled`, `refunds/create`. O **backfill incremental**
(cobre webhooks perdidos) é `POST /api/sync/shopify` — agende a cada 15 min via cron.

Simular uma entrega assinada (com o servidor rodando):

```bash
npm run webhook:simulate -- orders/create   # cria/atualiza um pedido fictício
npm run webhook:simulate -- refunds/create  # marca reembolso
```

Em desenvolvimento com uma loja real, exponha o endpoint via Shopify CLI
(`shopify app dev`) ou um túnel (cloudflared/ngrok) e cadastre os webhooks.

### Modo fictício do PDV / loja física (Bling)

Com `PDV_FIXTURE=1`, a loja física fica **"conectada"** ao **Bling** (fictício) e
alimenta o pipeline real (mapper por sistema → banco). O mapper é isolado por
sistema em `src/lib/data-sources/pdv/mappers/` — trocar de ERP é escrever outro
mapper. Um cupom/código de vendedor vira ponte de atribuição (`utmCampaign`).

```bash
echo 'PDV_FIXTURE=1' >> .env
npm run sync:pdv -- --full   # backfill fictício de vendas -> banco (~1,5s)
```

Também roda sozinho na primeira leitura (lazy). Para dados reais, defina
`PDV_SYSTEM`, `PDV_API_BASE_URL`, `PDV_API_KEY` e `PDV_AUTH_TYPE`.

Ligando as duas fontes fictícias de uma vez:

```bash
SHOPIFY_FIXTURE=1 PDV_FIXTURE=1 npm run dev
```

### Funil real (Web Pixels Extension)

A Admin API só entrega pedidos; o funil das 6 etapas exige eventos de
comportamento. A extensão em `extensions/funil-web-pixel/` escuta os eventos
padrão do storefront (`page_viewed`, `product_viewed`, `product_added_to_cart`,
`checkout_started`, `checkout_contact_info_submitted`, `checkout_completed`),
carimba as UTMs da sessão (1º clique) e envia para `POST /api/pixel`, que
persiste em `FunnelEvent`. O funil passa a ser **real e filtrável por campanha**.

- Deploy da extensão: `shopify app deploy` (num app Shopify), depois ative o
  pixel no admin e configure o campo `endpoint` para `https://SEU_APP/api/pixel`.
- No modo `SHOPIFY_FIXTURE=1`, um stream de eventos fictício é gerado na primeira
  leitura do funil, deixando as 6 etapas reais na demonstração. Sem eventos no
  período, o funil cai no estimado (Opção C) e sinaliza demonstração.

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
