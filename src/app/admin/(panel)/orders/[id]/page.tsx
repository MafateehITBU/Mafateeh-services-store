import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { OrderDetail } from "@/components/dashboard/order-detail";

export const metadata = { title: "Order" };
export const instant = false;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <AdminPageHeader title="Order" description="Saved prices, customer details, and payment attempts for this order." />
      <OrderDetail id={id} />
    </>
  );
}
