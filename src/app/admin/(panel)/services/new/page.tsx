import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ServiceEditor } from "@/components/dashboard/service-editor";

export const metadata = { title: "Add service" };
export const instant = false;

export default async function NewServicePage({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  const { fresh } = await searchParams;

  return (
    <>
      <AdminPageHeader title="Add service" description="Save a draft while you prepare the content, then publish it when both languages and the cover image are ready." />
      <ServiceEditor key={fresh ?? "new"} />
    </>
  );
}
