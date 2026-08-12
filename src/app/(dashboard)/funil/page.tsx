import { Topbar } from "@/components/dashboard/topbar";
import { FunnelDetailed } from "@/components/dashboard/funnel-detailed";

export default function FunilPage() {
  return (
    <>
      <Topbar title="Funil de conversão" />
      <div className="p-4 sm:p-6">
        <FunnelDetailed />
      </div>
    </>
  );
}
