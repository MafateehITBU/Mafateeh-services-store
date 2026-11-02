import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { EmptyState } from "@/components/dashboard/empty-state";

export function AdminModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />
      <EmptyState
        title="This module is awaiting implementation"
        body="The screen is reserved for a later phase. No management actions are available here yet."
      />
    </>
  );
}
