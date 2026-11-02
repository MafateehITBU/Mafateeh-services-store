import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { OrdersManager } from "@/components/dashboard/orders-manager";

export const metadata = { title: "Orders" };
export const instant = false;

export default function AdminOrdersPage() {
  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Review orders and move them through the allowed fulfillment statuses. Payment records stay unchanged."
      />
      <OrdersManager />
    </>
  );
}
