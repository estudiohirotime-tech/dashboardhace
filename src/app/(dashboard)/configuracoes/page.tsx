import { Topbar } from "@/components/dashboard/topbar";
import { ConfigPanel } from "@/components/dashboard/config-panel";

export default function ConfiguracoesPage() {
  return (
    <>
      <Topbar title="Configurações" />
      <div className="p-4 sm:p-6">
        <ConfigPanel />
      </div>
    </>
  );
}
