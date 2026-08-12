import { Topbar } from "@/components/dashboard/topbar";
import { AttributionTable } from "@/components/dashboard/attribution-table";
import { ChannelRevenueBar } from "@/components/dashboard/channel-revenue-bar";
import { Card } from "@/components/ui/primitives";
import { Info } from "lucide-react";

export default function OrigensPage() {
  return (
    <>
      <Topbar title="Origens" />
      <div className="space-y-4 p-4 sm:p-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AttributionTable />
          </div>
          <div className="lg:col-span-5">
            <ChannelRevenueBar />
          </div>
        </section>

        <Card className="flex items-start gap-3">
          <Info size={18} style={{ color: "var(--accent-bright)" }} className="mt-0.5 shrink-0" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            O comparativo de ROI por canal aparece aqui quando houver custo de mídia informado por
            campanha. A entrada de custos e o cálculo de ROAS entram na Fase 7.
          </p>
        </Card>
      </div>
    </>
  );
}
