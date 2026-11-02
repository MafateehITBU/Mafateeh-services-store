import { CategoriesManager } from "@/components/dashboard/categories-manager";
import { AdminPageHeader } from "@/components/dashboard/admin-page-header";

export const metadata = { title: "Categories" };
export const instant = false;

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Publish bilingual categories for the storefront menu. Both English and Arabic are required."
      />
      <CategoriesManager />
    </>
  );
}
