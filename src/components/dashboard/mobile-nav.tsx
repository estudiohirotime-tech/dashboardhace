"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radio, Filter, ShoppingBag, Package, Settings } from "lucide-react";

const NAV = [
  { href: "/", label: "Geral", icon: LayoutDashboard },
  { href: "/origens", label: "Origens", icon: Radio },
  { href: "/funil", label: "Funil", icon: Filter },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/configuracoes", label: "Config", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky bottom-0 z-30 flex items-stretch justify-around border-t md:hidden"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px]"
            style={{ color: active ? "var(--accent-bright)" : "var(--text-muted)" }}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
