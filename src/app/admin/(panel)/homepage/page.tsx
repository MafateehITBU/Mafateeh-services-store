import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { HomepageManager } from "@/components/dashboard/homepage-manager";

export const metadata = { title: "Homepage Content" };
export const instant = false;

export default function AdminHomepagePage() {
  return (
    <>
      <AdminPageHeader
        title="Homepage"
        description="Arrange the hero carousel, promotional banners, and the category and service sections shown on the public homepage."
      />
      <HomepageManager />
    </>
  );
}
