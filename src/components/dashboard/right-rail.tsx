"use client";

import { useState } from "react";
import { Radio, X } from "lucide-react";
import { RecentOrdersPanel } from "./recent-orders-panel";

/** Rail direito: coluna fixa em telas grandes; drawer acionável em telas menores. */
export function RightRail() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Coluna fixa (>= 1280px) */}
      <aside
        className="sticky top-0 hidden h-screen w-[320px] shrink-0 border-l xl:block"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <RecentOrdersPanel />
      </aside>

      {/* Botão flutuante (< 1280px) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-lg xl:hidden md:bottom-4"
        style={{ background: "var(--accent)", color: "#fff" }}
        aria-label="Abrir pedidos em tempo real"
      >
        <Radio size={20} />
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-0 h-full w-[320px] max-w-[85vw] border-l"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10"
              style={{ color: "var(--text-muted)" }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
            <RecentOrdersPanel />
          </div>
        </div>
      )}
    </>
  );
}
