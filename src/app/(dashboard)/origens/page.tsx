import { Topbar } from "@/components/dashboard/topbar";
import { AttributionTable } from "@/components/dashboard/attribution-table";
import { ChannelRevenueBar } from "@/components/dashboard/channel-revenue-bar";
import { RoiPanel } from "@/components/dashboard/roi-panel";

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

        <RoiPanel />
      </div>
    </>
  );
}
