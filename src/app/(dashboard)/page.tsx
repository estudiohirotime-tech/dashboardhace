import { Topbar } from "@/components/dashboard/topbar";
import { IgKpiRow } from "@/components/dashboard/ig-kpi-row";
import { FollowerChart } from "@/components/dashboard/follower-chart";
import { ReachChart } from "@/components/dashboard/reach-chart";
import { MediaTable } from "@/components/dashboard/media-table";

export default function OverviewPage() {
  return (
    <>
      <Topbar title="Visão geral" />
      <div className="space-y-4 p-4 sm:p-6">
        <IgKpiRow />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FollowerChart />
          <ReachChart />
        </section>
        <MediaTable variant="top" />
      </div>
    </>
  );
}
