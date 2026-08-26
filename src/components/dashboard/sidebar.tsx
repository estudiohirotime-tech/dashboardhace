"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Images,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Instagram,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/conteudo", label: "Conteúdo", icon: Images },
  { href: "/audiencia", label: "Audiência", icon: Users },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col border-r md:flex"
      style={{
        width: collapsed ? 72 : 260,
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
        transition: "width 160ms ease",
      }}
    >
      <div
        className="flex h-16 items-center gap-2 px-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: "var(--accent-soft)", color: "var(--accent-bright)" }}
        >
          <Instagram size={18} />
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Insights IG
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center",
              )}
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent-bright)" : "var(--text-secondary)",
              }}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        title="Sair"
        className={cn(
          "mx-3 mt-3 flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium",
          collapsed && "justify-center",
        )}
        style={{ color: "var(--text-secondary)" }}
      >
        <LogOut size={18} className="shrink-0" />
        {!collapsed && <span>Sair</span>}
      </button>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="m-3 mt-1 flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm"
        style={{ color: "var(--text-muted)" }}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span>Recolher</span>}
      </button>
    </aside>
  );
}
