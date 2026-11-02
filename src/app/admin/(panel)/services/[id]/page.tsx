import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ServiceEditor } from "@/components/dashboard/service-editor";

export const metadata = { title: "Edit service" };
export const instant = false;

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const readOnly = mode === "view";

  return (
    <>
      <AdminPageHeader
        title={readOnly ? "View service" : "Edit service"}
        description={readOnly ? "This is the stored service. Ratings appear only after approved reviews exist." : "Update the service, its images, description, price, and packages."}
      />
      <ServiceEditor serviceId={id} readOnly={readOnly} />
    </>
  );
}
