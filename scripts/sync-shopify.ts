// CLI de backfill Shopify -> banco. Uso:
//   SHOPIFY_FIXTURE=1 npm run sync:shopify        (modo fictício)
//   npm run sync:shopify -- --full                (backfill completo)
import { syncShopify } from "../src/lib/data-sources/shopify/sync";

const full = process.argv.includes("--full");

syncShopify({ full })
  .then((r) => {
    console.log(`Sync Shopify concluído: ${r.imported} pedidos, ${r.pages} páginas${r.fixture ? " (fixture)" : ""}.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Falha no sync:", e);
    process.exit(1);
  });
