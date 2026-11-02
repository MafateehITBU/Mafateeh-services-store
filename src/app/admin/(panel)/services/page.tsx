import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ServicesManager } from "@/components/dashboard/services-manager";
import Link from "next/link";

export const metadata = { title: "Services" };
export const instant = false;

export default function AdminServicesPage() {
  return (
    <>
      <AdminPageHeader
        title="Services"
        description="Create bilingual services, store their images in the database, and publish them when the content is complete."
        action={
          <Link href="/admin/services/new" className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
            Add service
          </Link>
        }
      />
      <ServicesManager />
    </>
  );
}
