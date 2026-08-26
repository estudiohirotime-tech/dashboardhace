// CLI de backfill PDV (loja física) -> banco. Uso:
//   PDV_FIXTURE=1 npm run sync:pdv        (modo fictício, sistema Bling)
//   npm run sync:pdv -- --full            (backfill completo)
import { syncPdv } from "../src/lib/data-sources/pdv/sync";

const full = process.argv.includes("--full");

syncPdv({ full })
  .then((r) => {
    console.log(`Sync PDV (${r.system}) concluído: ${r.imported} vendas, ${r.pages} páginas${r.fixture ? " (fixture)" : ""}.`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Falha no sync PDV:", e);
    process.exit(1);
  });
