import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AccountSettings } from "@/components/dashboard/account-settings";
import { CatalogTransfer } from "@/components/dashboard/catalog-transfer";

export const metadata = { title: "Settings" };
export const instant = false;

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Update the signed-in administrator account, and move the store catalog between databases. Store secrets stay in the server environment."
      />
      <AccountSettings />
      <div className="mt-6">
        <CatalogTransfer />
      </div>
    </>
  );
}
