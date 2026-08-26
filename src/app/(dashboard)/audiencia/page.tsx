import { Topbar } from "@/components/dashboard/topbar";
import { AudiencePanel } from "@/components/dashboard/audience-panel";

export default function AudienciaPage() {
  return (
    <>
      <Topbar title="Audiência" />
      <div className="p-4 sm:p-6">
        <AudiencePanel />
      </div>
    </>
  );
}
