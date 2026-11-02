"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge, statusLabel, statusTone } from "@/components/dashboard/status-badge";

type OrderDetailData = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  nextStatuses: string[];
  customer: { id: string; name: string; email: string; phone: string | null };
  items: { id: string; name: string; option: string | null; unitPrice: string; currency: string; quantity: number; lineTotal: string }[];
  payments: { id: string; provider: string; status: string; amount: string; currency: string; reference: string | null; paidAt: string | null; createdAt: string }[];
  loyalty: { id: string; type: string; points: number; description: string; createdAt: string }[];
  history: { id: string; from: string | null; to: string | null; actorEmail: string; createdAt: string }[];
};

export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/orders/${id}`);
    const body = (await response.json().catch(() => null)) as OrderDetailData & { message?: string };
    if (!response.ok) {
      setError(body?.message || "Order could not be loaded.");
      setLoading(false);
      return;
    }
    setOrder(body);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function changeStatus(status: string) {
    setBusy(true);
    setNotice("");
    setError("");
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json().catch(() => null)) as { message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body?.message || "The order status could not be changed.");
      return;
    }
    setNotice("Order status updated. Payment status was left unchanged.");
    await load();
  }

  if (loading) return <LoadingState />;
  if (!order) return <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error || "Order not found."}</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="cursor-pointer text-sm font-semibold text-brand">Back to orders</Link>
      {notice ? <p className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-rich">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-muted">Placed {order.createdAt.slice(0, 16).replace("T", " ")}</p>
            {order.completedAt ? <p className="text-sm text-muted">Completed {order.completedAt.slice(0, 16).replace("T", " ")}</p> : null}
          </div>
          <div className="flex gap-2">
            <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
            <StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Customer: <Link href={`/admin/users/${order.customer.id}`} className="cursor-pointer font-semibold text-brand">{order.customer.name}</Link>
          {" · "}{order.customer.email}{order.customer.phone ? ` · ${order.customer.phone}` : ""}
        </p>
        {order.nextStatuses.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {order.nextStatuses.map((status) => (
              <Button key={status} variant="secondary" disabled={busy} onClick={() => void changeStatus(status)}>
                Mark {statusLabel(status)}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">This order has no further status changes.</p>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Items</h2>
        <DataTable
          columns={[
            { key: "name", header: "Service", cell: (row) => row.option ? `${row.name} (${row.option})` : row.name },
            { key: "qty", header: "Qty", cell: (row) => row.quantity },
            { key: "price", header: "Unit price", cell: (row) => `${row.currency} ${row.unitPrice}` },
            { key: "line", header: "Line total", cell: (row) => `${row.currency} ${row.lineTotal}` },
          ]}
          rows={order.items}
          emptyTitle="No items"
          emptyBody="This order has no saved line items."
        />
        <dl className="mt-4 grid gap-2 text-sm sm:max-w-sm sm:justify-self-end">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{order.currency} {order.subtotal}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>{order.currency} {order.discount}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{order.currency} {order.tax}</dd></div>
          <div className="flex justify-between font-bold"><dt>Total</dt><dd>{order.currency} {order.total}</dd></div>
        </dl>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Status history</h2>
        {order.history.length === 0 ? (
          <EmptyState title="No status changes yet" body="Administrator status updates are recorded here." />
        ) : (
          <ul className="divide-y divide-line">
            {order.history.map((entry) => (
              <li key={entry.id} className="py-3 text-sm">
                <p className="font-semibold">{statusLabel(entry.from ?? "UNKNOWN")} to {statusLabel(entry.to ?? "UNKNOWN")}</p>
                <p className="mt-1 text-xs text-muted">{entry.actorEmail} · {entry.createdAt.slice(0, 16).replace("T", " ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Payments</h2>
        {order.payments.length === 0 ? (
          <EmptyState title="No payment attempts" body="Payment gateway records will appear here. Changing the order status does not create a payment." />
        ) : (
          <DataTable
            columns={[
              { key: "provider", header: "Provider", cell: (row) => row.provider },
              { key: "status", header: "Status", cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge> },
              { key: "amount", header: "Amount", cell: (row) => `${row.currency} ${row.amount}` },
              { key: "reference", header: "Reference", cell: (row) => row.reference || "—" },
              { key: "date", header: "Created", cell: (row) => row.createdAt.slice(0, 16).replace("T", " ") },
            ]}
            rows={order.payments}
            emptyTitle="No payment attempts"
            emptyBody="Payment gateway records will appear here."
          />
        )}
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Loyalty on this order</h2>
        {order.loyalty.length === 0 ? (
          <EmptyState title="No loyalty transactions" body="Points earned or redeemed on this order will appear here." />
        ) : (
          <DataTable
            columns={[
              { key: "type", header: "Type", cell: (row) => statusLabel(row.type) },
              { key: "points", header: "Points", cell: (row) => row.points },
              { key: "description", header: "Description", cell: (row) => row.description },
              { key: "date", header: "Date", cell: (row) => row.createdAt.slice(0, 10) },
            ]}
            rows={order.loyalty}
            emptyTitle="No loyalty transactions"
            emptyBody="Points earned or redeemed on this order will appear here."
          />
        )}
      </section>
    </div>
  );
}
