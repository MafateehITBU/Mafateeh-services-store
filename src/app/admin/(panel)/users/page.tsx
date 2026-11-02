import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { CustomersManager } from "@/components/dashboard/customers-manager";

export const metadata = { title: "Customers" };
export const instant = false;

export default function AdminCustomersPage() {
  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Search customer accounts, review their orders, and suspend or reactivate access. Roles stay customer."
      />
      <CustomersManager />
    </>
  );
}
