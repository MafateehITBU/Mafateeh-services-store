"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge, statusLabel, statusTone } from "@/components/dashboard/status-badge";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  emailVerifiedAt: string | null;
  createdAt: string;
  loyalty: {
    pointsBalance: number;
    transactions: {
      id: string;
      type: string;
      points: number;
      description: string;
      orderNumber: string | null;
      createdAt: string;
    }[];
  } | null;
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    createdAt: string;
  }[];
};

export function CustomerDetail({ id }: { id: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/admin/customers/${id}`);
    const body = (await response.json().catch(() => null)) as Customer & { message?: string };
    if (!response.ok) {
      setError(body?.message || "Customer could not be loaded.");
      setLoading(false);
      return;
    }
    setCustomer(body);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function setStatus(status: Customer["status"]) {
    setBusy(true);
    setNotice("");
    setError("");
    const response = await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json().catch(() => null)) as { message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body?.message || "The account status could not be changed.");
      return;
    }
    setNotice("Account status updated.");
    await load();
  }

  if (loading) return <LoadingState />;
  if (!customer) return <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error || "Customer not found."}</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="cursor-pointer text-sm font-semibold text-brand">Back to customers</Link>
      {notice ? <p className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-rich">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{customer.name}</h2>
            <p className="mt-1 text-sm text-muted">{customer.email}</p>
            <p className="mt-1 text-sm text-muted">{customer.phone || "No phone number"}</p>
          </div>
          <StatusBadge tone={statusTone(customer.status)}>{statusLabel(customer.status)}</StatusBadge>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Registered</dt><dd className="font-semibold">{customer.createdAt.slice(0, 10)}</dd></div>
          <div><dt className="text-muted">Email verified</dt><dd className="font-semibold">{customer.emailVerifiedAt ? customer.emailVerifiedAt.slice(0, 10) : "Not yet"}</dd></div>
          <div><dt className="text-muted">Loyalty points</dt><dd className="font-semibold">{customer.loyalty?.pointsBalance ?? 0}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy || customer.status === "ACTIVE"} onClick={() => void setStatus("ACTIVE")}>Activate</Button>
          <Button variant="secondary" disabled={busy || customer.status === "SUSPENDED"} onClick={() => void setStatus("SUSPENDED")}>Suspend</Button>
          <Button variant="secondary" disabled={busy || customer.status === "DEACTIVATED"} onClick={() => void setStatus("DEACTIVATED")}>Deactivate</Button>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Orders</h2>
        {customer.orders.length === 0 ? (
          <EmptyState title="No orders" body="This customer has not placed an order." />
        ) : (
          <DataTable
            columns={[
              {
                key: "number",
                header: "Order",
                cell: (row) => <Link href={`/admin/orders/${row.id}`} className="cursor-pointer font-semibold text-brand">{row.orderNumber}</Link>,
              },
              { key: "status", header: "Order", cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge> },
              { key: "payment", header: "Payment", cell: (row) => <StatusBadge tone={statusTone(row.paymentStatus)}>{statusLabel(row.paymentStatus)}</StatusBadge> },
              { key: "total", header: "Total", cell: (row) => row.total },
              { key: "date", header: "Date", cell: (row) => row.createdAt.slice(0, 10) },
            ]}
            rows={customer.orders}
            emptyTitle="No orders"
            emptyBody="This customer has not placed an order."
          />
        )}
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-lg font-bold">Loyalty</h2>
        {!customer.loyalty || customer.loyalty.transactions.length === 0 ? (
          <EmptyState title="No loyalty activity" body="Points and transactions will appear when this customer earns or redeems them." />
        ) : (
          <DataTable
            columns={[
              { key: "type", header: "Type", cell: (row) => statusLabel(row.type) },
              { key: "points", header: "Points", cell: (row) => row.points },
              { key: "description", header: "Description", cell: (row) => row.description },
              { key: "order", header: "Order", cell: (row) => row.orderNumber || "—" },
              { key: "date", header: "Date", cell: (row) => row.createdAt.slice(0, 10) },
            ]}
            rows={customer.loyalty.transactions}
            emptyTitle="No loyalty activity"
            emptyBody="Points and transactions will appear when this customer earns or redeems them."
          />
        )}
      </section>
    </div>
  );
}
