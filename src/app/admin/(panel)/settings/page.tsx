import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AccountSettings } from "@/components/dashboard/account-settings";

export const metadata = { title: "Settings" };
export const instant = false;

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Update the signed-in administrator account. Store secrets stay in the server environment."
      />
      <AccountSettings />
    </>
  );
}
