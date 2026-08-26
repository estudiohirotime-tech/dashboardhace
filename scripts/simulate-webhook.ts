// Simula uma entrega de webhook da Shopify (assinada), contra o servidor local.
// Uso:
//   npm run webhook:simulate -- orders/create
//   npm run webhook:simulate -- refunds/create
//
// O secret usado é SHOPIFY_WEBHOOK_SECRET (ou "fixture-secret", padrão do modo fixture).
import { signWebhook, type ShopifyWebhookTopic } from "../src/lib/data-sources/shopify/webhook";

const topic = (process.argv[2] ?? "orders/create") as ShopifyWebhookTopic;
const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "fixture-secret";
const url = `${base}/api/webhooks/shopify`;

const orderId = Number(String(Date.now()).slice(-9));

function buildPayload(): unknown {
  if (topic === "refunds/create") {
    return { id: orderId, order_id: orderId, created_at: new Date().toISOString() };
  }
  return {
    id: orderId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    financial_status: topic === "orders/cancelled" ? "voided" : "paid",
    total_price: "349.70",
    currency: "BRL",
    landing_site: "/?utm_source=instagram&utm_medium=paid_social&utm_campaign=webhook-teste",
    referring_site: "https://l.instagram.com/",
    source_name: "web",
    note_attributes: [],
    customer: { id: 90210, first_name: "Cliente", last_name: "Webhook", email: "webhook@teste.com", orders_count: 1 },
    line_items: [
      { id: 1, title: "Tênis Corrida AeroLeve", quantity: 1, price: "349.70", product_id: 1 },
    ],
  };
}

async function main() {
  const rawBody = JSON.stringify(buildPayload());
  const hmac = signWebhook(rawBody, secret);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Topic": topic,
      "X-Shopify-Hmac-Sha256": hmac,
      "X-Shopify-Shop-Domain": "loja-ficticia.myshopify.com",
    },
    body: rawBody,
  });

  console.log(`POST ${url}`);
  console.log(`Tópico: ${topic} · Pedido: ${orderId} · HTTP ${res.status}`);
  console.log("Resposta:", await res.text());
  console.log("Verifique em /pedidos (busque por 'webhook@teste.com').");
}

main().catch((e) => {
  console.error("Falha:", e);
  process.exit(1);
});
