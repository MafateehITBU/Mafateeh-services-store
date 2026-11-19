"use client";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { StoredImage } from "@/components/ui/stored-image";
import { Eye, Pencil, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type ServiceRow = {
  id: string;
  coverImageUrl: string | null;
  name: string;
  category: string;
  basePrice: string;
  currency: string;
  ratingAverage: number | null;
  reviewCount: number;
  status: "draft" | "published" | "inactive";
  isFeatured: boolean;
  createdAt: string;
};

type ListResponse = {
  stats: { total: number; published: number; draft: number; inactive: number };
  page: number;
  pageCount: number;
  services: ServiceRow[];
  message?: string;
};

type CategoryOption = { id: string; title: string };

export function AddServiceButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/admin/services/new?fresh=${Date.now()}`)}
      className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
    >
      Add service
    </button>
  );
}

export function ServicesManager() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published" | "inactive">("all");
  const [featured, setFeatured] = useState<"all" | "featured" | "standard">("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; kind: "delete" | "publish" | "deactivate" | "reactivate" } | null>(null);

  useEffect(() => {
    void fetch("/api/admin/categories?view=options")
      .then((response) => response.json())
      .then((payload: { options?: CategoryOption[] }) => setCategories(payload.options ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), search: query, categoryId, status, featured, sort });
    const response = await fetch(`/api/admin/services?${params.toString()}`);
    const payload = (await response.json()) as ListResponse;

    if (!response.ok) {
      setError(payload.message ?? "Services could not be loaded.");
      setLoading(false);
      return;
    }

    setData(payload);
    setLoading(false);
  }, [page, query, categoryId, status, featured, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function runConfirm() {
    if (!confirm) {
      return;
    }

    const response =
      confirm.kind === "delete"
        ? await fetch(`/api/admin/services/${confirm.id}`, { method: "DELETE" })
        : await fetch(`/api/admin/services/${confirm.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: confirm.kind === "deactivate" ? "deactivate" : confirm.kind === "reactivate" ? "reactivate" : "publish",
            }),
          });
    const payload = (await response.json()) as { message?: string };
    const kind = confirm.kind;
    setConfirm(null);

    if (!response.ok) {
      setToast(payload.message ?? "The service could not be updated.");
      return;
    }

    setToast(kind === "delete" ? "Service deleted." : kind === "deactivate" ? "Service deactivated." : kind === "reactivate" ? "Service reactivated." : "Service published.");
    await load();
  }

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total services" value={data?.stats.total ?? 0} />
        <StatCard label="Published" value={data?.stats.published ?? 0} />
        <StatCard label="Drafts" value={data?.stats.draft ?? 0} />
        <StatCard label="Inactive" value={data?.stats.inactive ?? 0} />
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
          <label className="sr-only" htmlFor="service-search">
            Search services
          </label>
          <input id="service-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by service name" className="h-11 w-full rounded-full border border-line bg-white px-4 text-sm" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Filter label="Category" value={categoryId} onChange={(value) => { setPage(1); setCategoryId(value); }}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </Filter>
        <Filter label="Status" value={status} onChange={(value) => { setPage(1); setStatus(value as typeof status); }}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
        </Filter>
        <Filter label="Featured" value={featured} onChange={(value) => { setPage(1); setFeatured(value as typeof featured); }}>
          <option value="all">Featured and standard</option>
          <option value="featured">Featured</option>
          <option value="standard">Not featured</option>
        </Filter>
        <Filter label="Sort" value={sort} onChange={(value) => { setPage(1); setSort(value); }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
          <option value="sort_order">Sort order</option>
        </Filter>
      </div>
      {loading ? <LoadingState /> : null}
      {!loading && error ? <EmptyState title="Services are unavailable" body={error} /> : null}
      {!loading && !error ? (
        <article className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
          <DataTable
            columns={[
              { key: "cover", header: "Cover", cell: (row) => <StoredImage src={row.coverImageUrl} alt="" className="size-12 rounded-xl" /> },
              { key: "name", header: "Service", cell: (row) => row.name },
              { key: "category", header: "Category", cell: (row) => row.category },
              { key: "price", header: "Price", cell: (row) => row.basePrice },
              { key: "currency", header: "Currency", cell: (row) => row.currency },
              { key: "rating", header: "Rating", cell: (row) => (row.reviewCount > 0 && row.ratingAverage !== null ? row.ratingAverage.toFixed(1) : "—") },
              { key: "reviews", header: "Reviews", cell: (row) => String(row.reviewCount) },
              {
                key: "status",
                header: "Status",
                cell: (row) => (
                  <StatusBadge tone={row.status === "published" ? "success" : row.status === "inactive" ? "neutral" : "warning"}>
                    {row.status === "published" ? "Published" : row.status === "inactive" ? "Inactive" : "Draft"}
                  </StatusBadge>
                ),
              },
              { key: "featured", header: "Featured", cell: (row) => (row.isFeatured ? "Yes" : "No") },
              { key: "created", header: "Created", cell: (row) => row.createdAt.slice(0, 10) },
              {
                key: "actions",
                header: "Actions",
                cell: (row) => (
                  <div className="flex gap-1">
                    <Link href={`/admin/services/${row.id}?mode=view`} aria-label={`View ${row.name}`} title={`View ${row.name}`} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-canvas-muted">
                      <Eye className="size-4" />
                    </Link>
                    <Link href={`/admin/services/${row.id}`} aria-label={`Edit ${row.name}`} title={`Edit ${row.name}`} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-canvas-muted">
                      <Pencil className="size-4" />
                    </Link>
                    <IconAction
                      label={row.status === "published" ? `Deactivate ${row.name}` : row.status === "inactive" ? `Reactivate ${row.name}` : `Publish ${row.name}`}
                      onClick={() => setConfirm({ id: row.id, name: row.name, kind: row.status === "published" ? "deactivate" : row.status === "inactive" ? "reactivate" : "publish" })}
                    >
                      <Power className="size-4" />
                    </IconAction>
                    <IconAction label={`Delete ${row.name}`} onClick={() => setConfirm({ id: row.id, name: row.name, kind: "delete" })}>
                      <Trash2 className="size-4" />
                    </IconAction>
                  </div>
                ),
              },
            ]}
            tableClassName="min-w-[72rem]"
            rows={data?.services ?? []}
            emptyTitle="No services yet"
            emptyBody="Add a service when you are ready to price it, describe it, and publish it."
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Page {data?.page ?? 1} of {data?.pageCount ?? 1}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button type="button" variant="secondary" disabled={page >= (data?.pageCount ?? 1)} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </article>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "delete" ? "Delete service" : confirm?.kind === "deactivate" ? "Deactivate service" : confirm?.kind === "reactivate" ? "Reactivate service" : "Publish service"}
        body={
          confirm?.kind === "delete"
            ? `${confirm.name} can be deleted only when it has no orders, reviews, or homepage links. Carts and wishlists that contain it will be cleared.`
            : confirm?.kind === "deactivate"
              ? `${confirm?.name ?? "This service"} will stay saved and can be reactivated later.`
              : `${confirm?.name ?? "This service"} will be checked for a cover image, both languages, an active category, and a valid price.`
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

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-full border border-line bg-white px-4">
        {children}
      </select>
    </label>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-canvas-muted">
      {children}
    </button>
  );
}
