import { Topbar } from "@/components/dashboard/topbar";
import { IgConfig } from "@/components/dashboard/ig-config";

export default function ConfiguracoesPage() {
  return (
    <>
      <Topbar title="Configurações" />
      <div className="p-4 sm:p-6">
        <IgConfig />
      </div>
    </>
  );
}
