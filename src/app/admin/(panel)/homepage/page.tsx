import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { HomepageManager } from "@/components/dashboard/homepage-manager";

export const metadata = { title: "Homepage Content" };
export const instant = false;

export default function AdminHomepagePage() {
  return (
    <>
      <AdminPageHeader
        title="Homepage"
        description="Arrange every homepage block, then edit its content from one page. The public homepage uses this order."
      />
      <HomepageManager />
    </>
  );
}
