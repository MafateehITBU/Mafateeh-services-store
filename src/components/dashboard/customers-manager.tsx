"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge, statusLabel, statusTone } from "@/components/dashboard/status-badge";

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
};

type CustomersResponse = {
  page: number;
  pageCount: number;
  total: number;
  customers: CustomerRow[];
};

const fieldClass = "h-11 rounded-full border border-line bg-white px-4 text-sm";

export function CustomersManager() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/admin/customers?${params.toString()}`);
    const body = (await response.json().catch(() => null)) as CustomersResponse & { message?: string };
    if (!response.ok) {
      setError(body?.message || "Customers could not be loaded.");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }, [from, page, query, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <input className={`${fieldClass} xl:col-span-2`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or phone" aria-label="Search customers" />
        <select className={fieldClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Account status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
        <input className={fieldClass} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} aria-label="Registered from" />
        <input className={fieldClass} type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} aria-label="Registered to" />
      </form>
      {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {loading ? <LoadingState /> : null}
      {!loading && data && data.customers.length === 0 ? (
        <EmptyState title="No customers" body="Customer accounts will appear here after they register." />
      ) : null}
      {!loading && data && data.customers.length > 0 ? (
        <DataTable
          tableClassName="min-w-[52rem]"
          columns={[
            { key: "name", header: "Customer", cell: (row) => row.name },
            { key: "email", header: "Email", cell: (row) => row.email },
            { key: "phone", header: "Phone", cell: (row) => row.phone || "—" },
            {
              key: "status",
              header: "Status",
              cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>,
            },
            { key: "created", header: "Registered", cell: (row) => row.createdAt.slice(0, 10) },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => (
                <Link href={`/admin/users/${row.id}`} className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">
                  View
                </Link>
              ),
            },
          ]}
          rows={data.customers}
          emptyTitle="No customers"
          emptyBody="Customer accounts will appear here after they register."
        />
      ) : null}
      {data && data.pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{data.total} customers · page {data.page} of {data.pageCount}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button variant="secondary" disabled={page >= data.pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
