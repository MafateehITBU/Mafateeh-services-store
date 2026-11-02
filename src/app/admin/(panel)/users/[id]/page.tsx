import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { CustomerDetail } from "@/components/dashboard/customer-detail";

export const metadata = { title: "Customer" };
export const instant = false;

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <AdminPageHeader title="Customer" description="Profile, orders, and loyalty activity for this customer account." />
      <CustomerDetail id={id} />
    </>
  );
}
