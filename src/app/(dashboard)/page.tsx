import { Topbar } from "@/components/dashboard/topbar";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ChannelDonut } from "@/components/dashboard/channel-donut";
import { CustomerCards } from "@/components/dashboard/customer-cards";
import { FunnelCompact } from "@/components/dashboard/funnel-compact";

export default function OverviewPage() {
  return (
    <>
      <Topbar title="Visão geral" />
      <div className="space-y-4 p-4 sm:p-6">
        {/* Faixa 1 — KPIs principais */}
        <KpiRow />

        {/* Faixa 2 — receita no tempo, donut de canais, cards de clientes */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <RevenueChart />
          </div>
          <div className="lg:col-span-5">
            <ChannelDonut />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <FunnelCompact />
          </div>
          <div className="lg:col-span-4">
            <CustomerCards />
          </div>
        </section>
      </div>
    </>
  );
}
