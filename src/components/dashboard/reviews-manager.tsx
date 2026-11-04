"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable } from "@/components/dashboard/data-table";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge, statusLabel, statusTone } from "@/components/dashboard/status-badge";

type ReviewRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  rating: number;
  comment: string;
  status: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

type ReviewsResponse = {
  page: number;
  pageCount: number;
  total: number;
  services: { id: string; name: string }[];
  reviews: ReviewRow[];
};

const fieldClass = "h-11 rounded-full border border-line bg-white px-4 text-sm";

export function ReviewsManager() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReviewRow | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (rating) params.set("rating", rating);
    if (serviceId) params.set("serviceId", serviceId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const response = await fetch(`/api/admin/reviews?${params.toString()}`);
    const body = (await response.json().catch(() => null)) as ReviewsResponse & { message?: string };
    if (!response.ok) {
      setError(body?.message || "Reviews could not be loaded.");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }, [from, page, query, rating, serviceId, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!selected || pendingDelete) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelected(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, selected]);

  async function moderate(review: ReviewRow, next: "APPROVED" | "REJECTED") {
    setBusy(true);
    setNotice("");
    setError("");
    const response = await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const body = (await response.json().catch(() => null)) as { message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body?.message || "The review could not be updated.");
      return;
    }
    setNotice(next === "APPROVED" ? "Review approved." : "Review rejected.");
    setSelected(null);
    await load();
  }

  async function removeReview() {
    if (!pendingDelete) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/reviews/${pendingDelete.id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => null)) as { message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(body?.message || "The review could not be deleted.");
      return;
    }
    setNotice("Review deleted.");
    setPendingDelete(null);
    setSelected(null);
    await load();
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-3 xl:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
        }}
      >
        <input className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews" aria-label="Search reviews" />
        <select className={fieldClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Review status">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select className={fieldClass} value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} aria-label="Rating">
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>{value} stars</option>
          ))}
        </select>
        <select className={fieldClass} value={serviceId} onChange={(event) => { setServiceId(event.target.value); setPage(1); }} aria-label="Service">
          <option value="">All services</option>
          {data?.services.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>
        <input className={fieldClass} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} aria-label="From date" />
        <input className={fieldClass} type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} aria-label="To date" />
      </form>
      {notice ? <p className="rounded-xl bg-brand/10 px-4 py-3 text-sm text-brand-rich">{notice}</p> : null}
      {error && !selected ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {loading ? <LoadingState /> : null}
      {!loading && data ? (
        <article className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
          <DataTable
            tableClassName="min-w-[64rem]"
            columns={[
              { key: "customer", header: "Customer", cell: (row) => row.customerName },
              { key: "service", header: "Service", cell: (row) => row.serviceName },
              { key: "rating", header: "Rating", cell: (row) => row.rating },
              { key: "comment", header: "Comment", cell: (row) => <span className="line-clamp-2 max-w-xs">{row.comment}</span> },
              { key: "date", header: "Submitted", cell: (row) => row.createdAt.slice(0, 10) },
              {
                key: "status",
                header: "Status",
                cell: (row) => <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>,
              },
              {
                key: "actions",
                header: "Actions",
                cell: (row) => (
                  <Button variant="secondary" className="min-h-9 px-4" onClick={() => setSelected(row)}>
                    View
                  </Button>
                ),
              },
            ]}
            rows={data.reviews}
            emptyTitle="No reviews"
            emptyBody="Reviews submitted by customers will appear here for moderation."
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Page {data.page} of {data.pageCount}</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= data.pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </article>
      ) : null}
      {selected ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
          <button type="button" aria-label="Close review" className="absolute inset-0 cursor-pointer bg-brand-deep/45" onClick={() => setSelected(null)} />
          <div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[var(--shadow-panel)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="review-dialog-title" className="text-xl font-bold">{selected.customerName}</h2>
                <p className="mt-1 text-sm text-muted">{selected.customerEmail} · {selected.serviceName}</p>
              </div>
              <StatusBadge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</StatusBadge>
            </div>
            <p className="mt-4 text-sm font-semibold">{selected.rating} out of 5{selected.verifiedPurchase ? " · Verified purchase" : ""}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.comment}</p>
            <p className="mt-2 text-xs text-muted">Submitted {selected.createdAt.slice(0, 16).replace("T", " ")}</p>
            {error ? <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button disabled={busy} onClick={() => void moderate(selected, "APPROVED")}>Approve</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void moderate(selected, "REJECTED")}>Reject</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setPendingDelete(selected)}>Delete</Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this review?"
        body="The review will be removed and will no longer affect the service rating."
        confirmLabel="Delete review"
        cancelLabel="Keep review"
        onConfirm={() => void removeReview()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
