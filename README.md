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
- [x] **Fase 7** — Seletor de modelo de atribuição (1º vs último clique) **aplicado ao cálculo**, ROI/ROAS por canal e polimento. (Exportação CSV já entregue na Fase 2.)

## Rodando localmente

Requer um **PostgreSQL** (local via Docker, ou um banco Neon/Vercel Postgres gratuito).

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL para o seu Postgres
npm run db:migrate            # aplica as migrations (prisma migrate deploy)
npm run dev                   # http://localhost:3000
```

Postgres local rápido com Docker:

```bash
docker run --name dash-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
```

Sem credenciais de Shopify/PDV, a aplicação sobe e renderiza todas as telas em modo
demonstração (mock). Com `SHOPIFY_FIXTURE=1`/`PDV_FIXTURE=1`, as fontes ficam
"conectadas" via pipeline real (ver abaixo).

### Modo fictício da Shopify (demonstração sem credenciais)

Com `SHOPIFY_FIXTURE=1`, a loja online fica **"conectada"** e alimenta o **pipeline real**
(validação Zod → mapper de UTM → agrupamento de canal → banco) com payloads Shopify
fictícios, sem rede nem token. Útil para ver a arquitetura funcionando ponta a ponta.

```bash
echo 'SHOPIFY_FIXTURE=1' >> .env
npm run db:migrate
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

### Modelo de atribuição (1º vs último clique)

Em **Configurações**, o seletor de modelo é **aplicado ao cálculo** de atribuição
e participação por canal (não é só cosmético):

- **Último clique** — crédito à origem que converteu (`landingPage`/último toque).
- **Primeiro clique** — crédito à origem que iniciou a jornada (`firstTouch` do
  `customerJourneySummary`), deslocando receita para os canais de descoberta.

O modelo viaja como `?attribution=first_click|last_click` para as APIs, aplicado
no servidor. A tela **Origens** também traz ROI/ROAS por canal (informe o custo
de mídia do período — salvo no navegador).

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

**PostgreSQL** (`provider = "postgresql"`), com migrations versionadas em
`prisma/migrations/`. Aplique com `npm run db:migrate` (produção) ou
`npm run db:migrate:dev` (criar novas migrations em dev). Todo valor monetário é
inteiro em centavos.

## Deploy na Railway (recomendado)

`railway.json` já configura tudo. O build **não** toca o banco (`prisma generate && next build`);
as migrations rodam no **start** (`prisma migrate deploy`), quando `DATABASE_URL` já existe.

1. **Projeto:** Railway → *New Project* → *Deploy from GitHub repo* → escolha o repositório e a
   branch `claude/omnichannel-sales-dashboard-rgr8x7`.
2. **Banco:** no projeto, *+ New* → *Database* → **PostgreSQL**. A Railway injeta `DATABASE_URL`
   (conexão direta — `prisma migrate deploy` funciona sem ajuste). Como alternativa, use o
   Supabase (nesse caso, use a string do **Session pooler**, porta 5432).
3. **Variáveis** (Service → *Variables*):
   - `AUTH_SECRET` (obrigatório) · `SHOPIFY_FIXTURE=1` e `PDV_FIXTURE=1` (demo) · `CRON_SECRET` (recomendado).
   - `DATABASE_URL` já vem do Postgres da Railway; se preferir referenciar, use `${{Postgres.DATABASE_URL}}`.
4. **Deploy.** A Railway builda e sobe. O app escuta a porta que a Railway define (`PORT`).
5. **Sincronização (cron):** a Railway não lê o cron do `vercel.json`. Opções:
   - criar um **Cron Service** na Railway com schedule `*/15 * * * *` e start `curl -fsS "$APP_URL/api/sync/all?secret=$SYNC_SECRET"`; ou
   - usar um cron externo grátis (cron-job.org) apontando para `/api/sync/all?secret=...`.
   No modo fixture, o backfill também roda sozinho na primeira leitura, então o cron é opcional.

> `vercel.json` é ignorado pela Railway (fica no repo caso você volte para a Vercel).

## Deploy na Vercel

O projeto já está otimizado para serverless: Postgres, migrations no build,
parceiros/sync no banco, webhook processado de forma síncrona e sincronização
por **Vercel Cron** (`vercel.json`).

1. **Banco:** no painel da Vercel → *Storage* → criar **Postgres** (ou conectar
   Neon). Isso injeta `DATABASE_URL`.
2. **Importar** o repositório como projeto na Vercel.
3. **Variáveis de ambiente:** para uma demo sem credenciais, defina
   `SHOPIFY_FIXTURE=1` e `PDV_FIXTURE=1`. Para dados reais, os `SHOPIFY_*`/`PDV_*`.
   Defina também `CRON_SECRET` (o Cron passa `Authorization: Bearer <CRON_SECRET>`)
   e, opcionalmente, `SYNC_SECRET` para disparo manual (`?secret=`).
4. **Build:** o `vercel.json` já usa
   `prisma generate && prisma migrate deploy && next build` — as migrations são
   aplicadas no deploy.
5. **Backfill inicial:** o Cron (`/api/sync/all`, a cada 15 min) popula o banco;
   ou dispare manualmente `POST /api/sync/all?full=1&secret=<SYNC_SECRET>`. Em
   volume grande, rode o backfill da sua máquina apontando `DATABASE_URL` para o
   banco de produção.
6. **Webhooks/pixel (dados reais):** aponte a Shopify para
   `https://SEU_APP/api/webhooks/shopify` e o pixel para `/api/pixel`.

**Notas de plano:** no **Hobby**, o Cron roda 1x/dia e as funções têm timeout de
10s — suficiente para o incremental e para a demo enxuta. Para sync de 15 min e
backfills maiores, use o **Pro** (as funções de sync já declaram `maxDuration`
de 300s). O **login de acesso** (Auth.js) ainda precisa ser adicionado para expor
publicamente com segurança.
