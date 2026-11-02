import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge, statusLabel, statusTone } from "@/components/dashboard/status-badge";
import { getDashboardOverview } from "@/server/admin/dashboard";
import Link from "next/link";

export const metadata = { title: "Overview" };
export const instant = false;

function formatWhen(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

export default async function AdminOverviewPage() {
  const overview = await getDashboardOverview();

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="Live counts from the store database. Empty sections stay empty until real records exist."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={overview.stats.totalCustomers} />
        <StatCard label="Services" value={overview.stats.totalServices} />
        <StatCard label="Published services" value={overview.stats.publishedServices} />
        <StatCard label="Active categories" value={overview.stats.activeCategories} />
        <StatCard label="Orders" value={overview.stats.totalOrders} />
        <StatCard label="Pending orders" value={overview.stats.pendingOrders} hint="Awaiting payment or fulfillment" />
        <StatCard label="Completed orders" value={overview.stats.completedOrders} />
        <StatCard label="Pending reviews" value={overview.stats.pendingReviews} />
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-bold">Paid revenue</h2>
        <p className="mt-1 text-sm text-muted">Totals from orders that are paid and are not cancelled or refunded. Currencies stay separate.</p>
        {overview.revenue.length === 0 ? (
          <p className="mt-4 text-3xl font-bold">0</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-6">
            {overview.revenue.map((row) => (
              <li key={row.currency}>
                <p className="text-sm text-muted">{row.currency}</p>
                <p className="text-3xl font-bold">{row.total}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-lg font-bold">Recent orders</h2>
          <DataTable
            columns={[
              {
                key: "number",
                header: "Order",
                cell: (row) => (
                  <Link href={`/admin/orders/${row.id}`} className="cursor-pointer font-semibold text-brand">
                    {row.orderNumber}
                  </Link>
                ),
              },
              { key: "customer", header: "Customer", cell: (row) => row.customer },
              {
                key: "status",
                header: "Status",
                cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>,
              },
              { key: "total", header: "Total", cell: (row) => row.total },
            ]}
            rows={overview.recentOrders}
            emptyTitle="No orders yet"
            emptyBody="Orders will appear here after customers complete checkout."
          />
        </article>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-lg font-bold">Recent customers</h2>
          <DataTable
            columns={[
              {
                key: "name",
                header: "Customer",
                cell: (row) => (
                  <Link href={`/admin/users/${row.id}`} className="cursor-pointer font-semibold text-brand">
                    {row.name}
                  </Link>
                ),
              },
              { key: "email", header: "Email", cell: (row) => row.email },
              {
                key: "status",
                header: "Status",
                cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>,
              },
              { key: "created", header: "Registered", cell: (row) => formatWhen(row.createdAt) },
            ]}
            rows={overview.recentCustomers}
            emptyTitle="No customers yet"
            emptyBody="Customer accounts will appear here after registration."
          />
        </article>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-lg font-bold">Best-performing services</h2>
          <DataTable
            columns={[
              { key: "name", header: "Service", cell: (row) => row.name },
              { key: "quantity", header: "Units", cell: (row) => row.quantity },
              { key: "total", header: "Sales", cell: (row) => `${row.currency} ${row.total}` },
            ]}
            rows={overview.bestServices}
            emptyTitle="No paid sales yet"
            emptyBody="This list uses paid orders that are not cancelled or refunded."
          />
        </article>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-lg font-bold">Order status</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {overview.statusSummary.map((row) => (
              <li key={row.status} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
                <span className="font-bold">{row.count}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Recent activity</h2>
        {overview.recentActivity.length === 0 ? (
          <EmptyState title="No administrative activity" body="Changes made from the dashboard will be recorded here." />
        ) : (
          <ul className="divide-y divide-line">
            {overview.recentActivity.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="text-sm font-semibold text-ink">
                  {entry.action} · {entry.entityType}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {entry.actorEmail} · {formatWhen(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
