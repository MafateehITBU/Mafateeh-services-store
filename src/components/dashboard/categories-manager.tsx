"use client";

import { CategoryForm, type CategoryDetail } from "@/components/dashboard/category-form";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { StoredImage } from "@/components/ui/stored-image";
import { Eye, Pencil, Power, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type CategoryRow = {
  id: string;
  imageUrl: string | null;
  name: string;
  servicesCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

type ListResponse = {
  stats: { total: number; active: number; inactive: number };
  page: number;
  pageCount: number;
  categories: CategoryRow[];
  message?: string;
};

export function CategoriesManager() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<{ category: CategoryDetail | null; readOnly: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; kind: "status" | "delete"; isActive?: boolean; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), search: query, status });
    const response = await fetch(`/api/admin/categories?${params.toString()}`);
    const payload = (await response.json()) as ListResponse;

    if (!response.ok) {
      setError(payload.message ?? "Categories could not be loaded.");
      setLoading(false);
      return;
    }

    setData(payload);
    setLoading(false);
  }, [page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function openForm(id?: string, readOnly = false) {
    if (!id) {
      setForm({ category: null, readOnly });
      return;
    }

    const detailResponse = await fetch(`/api/admin/categories/${id}`);
    const detail = (await detailResponse.json()) as CategoryDetail & { message?: string };

    if (!detailResponse.ok) {
      setToast(detail.message ?? "That category could not be opened.");
      return;
    }

    setForm({ category: detail, readOnly });
  }

  async function runConfirm() {
    if (!confirm) {
      return;
    }

    const response =
      confirm.kind === "delete"
        ? await fetch(`/api/admin/categories/${confirm.id}`, { method: "DELETE" })
        : await fetch(`/api/admin/categories/${confirm.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: confirm.isActive }),
          });
    const payload = (await response.json()) as { message?: string };
    setConfirm(null);

    if (!response.ok) {
      setToast(payload.message ?? "The category could not be updated.");
      return;
    }

    setToast(confirm.kind === "delete" ? "Category deleted." : confirm.isActive ? "Category activated." : "Category deactivated.");
    await load();
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total categories" value={data?.stats.total ?? 0} />
          <StatCard label="Active" value={data?.stats.active ?? 0} />
          <StatCard label="Inactive" value={data?.stats.inactive ?? 0} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search);
          }}
        >
          <label className="sr-only" htmlFor="category-search">
            Search categories
          </label>
          <input
            id="category-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or slug"
            className="h-11 w-full rounded-full border border-line bg-white px-4 text-sm"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <label className="text-sm font-semibold">
          <span className="sr-only">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as "all" | "active" | "inactive");
            }}
            className="h-11 rounded-full border border-line bg-white px-4"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <Button type="button" onClick={() => void openForm()}>
          Add category
        </Button>
      </div>
      {loading ? <LoadingState /> : null}
      {!loading && error ? <EmptyState title="Categories are unavailable" body={error} /> : null}
      {!loading && !error ? (
        <article className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
          <DataTable
            columns={[
              {
                key: "image",
                header: "Image",
                cell: (row) => <StoredImage src={row.imageUrl} alt="" className="size-10 rounded-xl" />,
              },
              { key: "name", header: "Name", cell: (row) => row.name },
              { key: "services", header: "Services", cell: (row) => String(row.servicesCount) },
              {
                key: "status",
                header: "Status",
                cell: (row) => (
                  <StatusBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</StatusBadge>
                ),
              },
              { key: "sort", header: "Sort", cell: (row) => String(row.sortOrder) },
              { key: "created", header: "Created", cell: (row) => row.createdAt.slice(0, 10) },
              {
                key: "actions",
                header: "Actions",
                cell: (row) => (
                  <div className="flex gap-1">
                    <IconAction label={`View ${row.name}`} onClick={() => void openForm(row.id, true)}>
                      <Eye className="size-4" />
                    </IconAction>
                    <IconAction label={`Edit ${row.name}`} onClick={() => void openForm(row.id)}>
                      <Pencil className="size-4" />
                    </IconAction>
                    <IconAction
                      label={row.isActive ? `Deactivate ${row.name}` : `Activate ${row.name}`}
                      onClick={() => setConfirm({ id: row.id, kind: "status", isActive: !row.isActive, name: row.name })}
                    >
                      <Power className="size-4" />
                    </IconAction>
                    <IconAction label={`Delete ${row.name}`} onClick={() => setConfirm({ id: row.id, kind: "delete", name: row.name })}>
                      <Trash2 className="size-4" />
                    </IconAction>
                  </div>
                ),
              },
            ]}
            rows={data?.categories ?? []}
            emptyTitle="No categories yet"
            emptyBody="Add a category when you are ready to publish it in the storefront menu."
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Page {data?.page ?? 1} of {data?.pageCount ?? 1}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= (data?.pageCount ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </article>
      ) : null}
      {form ? (
        <CategoryForm
          category={form.category}
          readOnly={form.readOnly}
          onClose={() => setForm(null)}
          onSaved={(message) => {
            setForm(null);
            setToast(message);
            void load();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "delete" ? "Delete category" : confirm?.isActive ? "Activate category" : "Deactivate category"}
        body={
          confirm?.kind === "delete"
            ? `${confirm.name} will be removed only if it has no subcategories, services, or homepage sections.`
            : `${confirm?.name ?? "This category"} will stay in the database. Its services will not be deleted.`
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Confirm"}
        cancelLabel="Cancel"
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
      {toast ? (
        <p role="status" className="fixed right-4 bottom-4 z-[90] max-w-sm rounded-2xl bg-brand-deep px-4 py-3 text-sm text-white shadow-[var(--shadow-panel)]">
          {toast}
          <button type="button" className="ml-3 cursor-pointer font-semibold underline" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </p>
      ) : null}
    </>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-canvas-muted">
      {children}
    </button>
  );
}
