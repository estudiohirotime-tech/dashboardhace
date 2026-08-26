export const dynamic = "force-dynamic";

import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen" style={{ background: "var(--bg-app)" }}>
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">{children}</main>
          <MobileNav />
        </div>
      </div>
    </Providers>
  );
}
