import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { AddServiceButton, ServicesManager } from "@/components/dashboard/services-manager";

export const metadata = { title: "Services" };
export const instant = false;

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="Services"
        description="Create bilingual services, store their images in the database, and publish them when the content is complete."
        action={<AddServiceButton />}
      />
      <ServicesManager key={created ?? "services"} />
    </>
  );
}
