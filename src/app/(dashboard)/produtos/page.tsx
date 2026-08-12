import { Topbar } from "@/components/dashboard/topbar";
import { ProductsTable } from "@/components/dashboard/products-table";

export default function ProdutosPage() {
  return (
    <>
      <Topbar title="Produtos" />
      <div className="p-4 sm:p-6">
        <ProductsTable />
      </div>
    </>
  );
}
