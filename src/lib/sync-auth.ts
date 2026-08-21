import type { NextRequest } from "next/server";

/**
 * Autoriza os endpoints de sincronização.
 * - Sem SYNC_SECRET nem CRON_SECRET configurados -> liberado (dev local).
 * - Com segredo configurado, aceita:
 *     ?secret=<SYNC_SECRET>
 *     header x-sync-secret: <SYNC_SECRET>
 *     Authorization: Bearer <CRON_SECRET>   (padrão do Vercel Cron)
 */
export function isSyncAuthorized(req: NextRequest): boolean {
  const syncSecret = process.env.SYNC_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  if (!syncSecret && !cronSecret) return true; // desenvolvimento

  const auth = req.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  if (syncSecret) {
    if (req.nextUrl.searchParams.get("secret") === syncSecret) return true;
    if (req.headers.get("x-sync-secret") === syncSecret) return true;
  }
  return false;
}
