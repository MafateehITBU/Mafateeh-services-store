"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge, statusLabel, statusTone } from "@/components/dashboard/status-badge";

type OrderRow = {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
};

type OrdersResponse = {
  page: number;
  pageCount: number;
  total: number;
  orders: OrderRow[];
};

const fieldClass = "h-11 rounded-full border border-line bg-white px-4 text-sm";

export function OrdersManager() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), sort });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/admin/orders?${params.toString()}`);
    const body = (await response.json().catch(() => null)) as OrdersResponse & { message?: string };
    if (!response.ok) {
      setError(body?.message || "Orders could not be loaded.");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }, [from, page, paymentStatus, query, sort, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-3 xl:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <input className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number or customer" aria-label="Search orders" />
        <select className={fieldClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Order status">
          <option value="">All order statuses</option>
          {["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"].map((value) => (
            <option key={value} value={value}>{statusLabel(value)}</option>
          ))}
        </select>
        <select className={fieldClass} value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }} aria-label="Payment status">
          <option value="">All payment statuses</option>
          {["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED"].map((value) => (
            <option key={value} value={value}>{statusLabel(value)}</option>
          ))}
        </select>
        <select className={fieldClass} value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort orders">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="total">Highest total</option>
        </select>
        <input className={fieldClass} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} aria-label="From date" />
        <input className={fieldClass} type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} aria-label="To date" />
      </form>
      {error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {loading ? <LoadingState /> : null}
      {!loading && data && data.orders.length === 0 ? (
        <EmptyState title="No orders" body="Orders will appear here after customers check out." />
      ) : null}
      {!loading && data && data.orders.length > 0 ? (
        <DataTable
          tableClassName="min-w-[64rem]"
          columns={[
            {
              key: "number",
              header: "Order",
              cell: (row) => <Link href={`/admin/orders/${row.id}`} className="cursor-pointer font-semibold text-brand">{row.orderNumber}</Link>,
            },
            { key: "customer", header: "Customer", cell: (row) => row.customer },
            {
              key: "status",
              header: "Order",
              cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>,
            },
            {
              key: "payment",
              header: "Payment",
              cell: (row) => <StatusBadge tone={statusTone(row.paymentStatus)}>{statusLabel(row.paymentStatus)}</StatusBadge>,
            },
            { key: "total", header: "Total", cell: (row) => row.total },
            { key: "date", header: "Date", cell: (row) => row.createdAt.slice(0, 10) },
          ]}
          rows={data.orders}
          emptyTitle="No orders"
          emptyBody="Orders will appear here after customers check out."
        />
      ) : null}
      {data && data.pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{data.total} orders · page {data.page} of {data.pageCount}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button variant="secondary" disabled={page >= data.pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
