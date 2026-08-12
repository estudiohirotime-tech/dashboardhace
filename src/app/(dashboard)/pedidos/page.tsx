import { Topbar } from "@/components/dashboard/topbar";
import { OrdersTable } from "@/components/dashboard/orders-table";

export default function PedidosPage() {
  return (
    <>
      <Topbar title="Pedidos" />
      <div className="p-4 sm:p-6">
        <OrdersTable />
      </div>
    </>
  );
}
