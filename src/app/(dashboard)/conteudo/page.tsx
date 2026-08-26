import { Topbar } from "@/components/dashboard/topbar";
import { MediaTable } from "@/components/dashboard/media-table";

export default function ConteudoPage() {
  return (
    <>
      <Topbar title="Conteúdo" />
      <div className="space-y-4 p-4 sm:p-6">
        <MediaTable variant="top" />
        <MediaTable variant="recent" />
      </div>
    </>
  );
}
