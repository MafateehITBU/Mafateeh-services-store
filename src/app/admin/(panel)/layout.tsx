import { AdminLayout } from "@/components/dashboard/admin-layout";
import { LoadingState } from "@/components/dashboard/loading-state";
import { requireAdmin } from "@/server/admin/authorization";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

export const instant = false;

function AccessMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
      </section>
    </main>
  );
}

async function ProtectedAdmin({ children }: { children: ReactNode }) {
  const access = await requireAdmin();

  if (!access.ok) {
    if (access.status === 401) {
      redirect("/admin/login");
    }

    if (access.status === 503) {
      return <AccessMessage title="Administration is not configured" body={access.message ?? "Set the administrator session secret."} />;
    }

    return (
      <AccessMessage
        title="Access denied"
        body="This account cannot open the administration area."
      />
    );
  }

  return <AdminLayout user={access.user}>{children}</AdminLayout>;
}

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
      <ProtectedAdmin>{children}</ProtectedAdmin>
    </Suspense>
  );
}
