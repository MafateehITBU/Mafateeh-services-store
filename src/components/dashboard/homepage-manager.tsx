"use client";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable } from "@/components/dashboard/data-table";
import { HomepagePreview, type PreviewBanner, type PreviewSection } from "@/components/dashboard/homepage-preview";
import { bannerDestinationError, isSafeBannerDestination } from "@/features/homepage/banner-destination";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { StoredImage } from "@/components/ui/stored-image";
import { ArrowDown, ArrowUp, Pencil, Power, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Placement = "HOME_HERO" | "HOME_PROMO";
type SectionType = "FEATURED_CATEGORIES" | "FEATURED_SERVICES" | "CATEGORY_SERVICES" | "CUSTOM_SERVICES";
type Tab = "hero" | "promo" | "sections" | "preview";

type Banner = PreviewBanner & { id: string; placement: Placement; sortOrder: number; createdAt: string };
type Section = PreviewSection & { id: string; sortOrder: number; maxItems: number; categoryId: string | null; createdAt: string };
type ServiceOption = { id: string; categoryId: string; name: string; category: string; price: string; currency: string; coverImageUrl: string | null };
type CategoryOption = { id: string; title: string };

type HomepagePayload = {
  banners: Banner[];
  sections: Section[];
  categories: CategoryOption[];
  services: ServiceOption[];
  message?: string;
};

const fieldClass = "h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm";
const sectionLabels: Record<SectionType, string> = {
  FEATURED_CATEGORIES: "Featured category",
  FEATURED_SERVICES: "Featured services",
  CATEGORY_SERVICES: "Category services",
  CUSTOM_SERVICES: "Custom services",
};

function readImage(file: File, onReady: (value: string) => void, onError: (message: string) => void) {
  if (file.size > 5 * 1024 * 1024) {
    onError("Images must be PNG, JPEG, or WebP files up to 5 MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
      onError("Images must be PNG, JPEG, or WebP files up to 5 MB.");
      return;
    }

    onReady(reader.result.replace(/^data:image\/jpg;/, "data:image/jpeg;"));
  };
  reader.onerror = () => onError("The image could not be read.");
  reader.readAsDataURL(file);
}

function dateInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;

  if (next < 0 || next >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

export function HomepageManager() {
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<Tab>("hero");
  const [previewLocale, setPreviewLocale] = useState<"en" | "ar">("en");
  const [data, setData] = useState<HomepagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<Banner | null>(null);
  const [sectionForm, setSectionForm] = useState<Section | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "banner" | "section"; id: string; action: "delete" | "status"; isActive?: boolean; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/homepage");
    const payload = (await response.json()) as HomepagePayload;

    if (!response.ok) {
      setError(payload.message ?? "Homepage content could not be loaded.");
      setLoading(false);
      return;
    }

    setData(payload);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveBanner() {
    if (!bannerForm) {
      return;
    }

    const destination = bannerForm.linkUrl?.trim() ?? "";

    if (destination && !isSafeBannerDestination(destination)) {
      setToast(bannerDestinationError);
      return;
    }

    const response = await fetch(bannerForm.id ? `/api/admin/homepage/banners/${bannerForm.id}` : "/api/admin/homepage/banners", {
      method: bannerForm.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        placement: bannerForm.placement,
        desktop: bannerForm.desktopImageUrl,
        mobile: bannerForm.mobileImageUrl,
        linkUrl: bannerForm.linkUrl,
        isActive: bannerForm.isActive,
        sortOrder: bannerForm.sortOrder,
        startsAt: bannerForm.startsAt,
        endsAt: bannerForm.endsAt,
        en: bannerForm.en,
        ar: bannerForm.ar,
      }),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setToast(payload.message ?? "The banner could not be saved.");
      return;
    }

    setBannerForm(null);
    setToast("Banner saved.");
    await load();
  }

  async function saveSection() {
    if (!sectionForm) {
      return;
    }

    const response = await fetch(sectionForm.id ? `/api/admin/homepage/sections/${sectionForm.id}` : "/api/admin/homepage/sections", {
      method: sectionForm.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: sectionForm.type,
        categoryId: sectionForm.categoryId,
        isActive: sectionForm.isActive,
        sortOrder: sectionForm.sortOrder,
        maxItems: sectionForm.maxItems,
        en: sectionForm.en,
        ar: sectionForm.ar,
        serviceIds: sectionForm.serviceIds,
      }),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setToast(payload.message ?? "The section could not be saved.");
      return;
    }

    setSectionForm(null);
    setToast("Section saved.");
    await load();
  }

  async function reorder(kind: "banner" | "section", placement: Placement | null, ids: string[]) {
    const response = await fetch(kind === "banner" ? "/api/admin/homepage/banners/reorder" : "/api/admin/homepage/sections/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "banner" ? { placement, ids } : { ids }),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setToast(payload.message ?? "The order could not be saved.");
    }

    await load();
  }

  async function runConfirm() {
    if (!confirm) {
      return;
    }

    const base = confirm.kind === "banner" ? `/api/admin/homepage/banners/${confirm.id}` : `/api/admin/homepage/sections/${confirm.id}`;
    const response =
      confirm.action === "delete"
        ? await fetch(base, { method: "DELETE" })
        : await fetch(`${base}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: confirm.isActive }),
          });
    const payload = (await response.json()) as { message?: string };
    setConfirm(null);

    if (!response.ok) {
      setToast(payload.message ?? "The change could not be saved.");
      return;
    }

    setToast("Saved.");
    await load();
  }

  const hero = data?.banners.filter((item) => item.placement === "HOME_HERO") ?? [];
  const promotions = data?.banners.filter((item) => item.placement === "HOME_PROMO") ?? [];
  const previewHero = bannerForm?.placement === "HOME_HERO" ? mergeBanner(hero, bannerForm) : hero;
  const previewPromos = bannerForm?.placement === "HOME_PROMO" ? mergeBanner(promotions, bannerForm) : promotions;
  const previewSections = sectionForm ? mergeSection(data?.sections ?? [], sectionForm) : (data?.sections ?? []);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Homepage content">
        <TabButton selected={tab === "hero"} onClick={() => setTab("hero")}>Hero carousel</TabButton>
        <TabButton selected={tab === "promo"} onClick={() => setTab("promo")}>Promotional banners</TabButton>
        <TabButton selected={tab === "sections"} onClick={() => setTab("sections")}>Sections</TabButton>
        <TabButton selected={tab === "preview"} onClick={() => setTab("preview")}>Preview</TabButton>
      </div>
      {loading ? <LoadingState /> : null}
      {!loading && error ? <EmptyState title="Homepage content is unavailable" body={error} /> : null}
      {!loading && !error && tab === "hero" ? (
        <BannerBoard
          placement="HOME_HERO"
          rows={hero}
          form={bannerForm?.placement === "HOME_HERO" ? bannerForm : null}
          onChange={setBannerForm}
          onSave={() => void saveBanner()}
          onCancel={() => setBannerForm(null)}
          onMove={(index, direction) => void reorder("banner", "HOME_HERO", moveItem(hero, index, direction).map((item) => item.id))}
          onConfirm={setConfirm}
        />
      ) : null}
      {!loading && !error && tab === "promo" ? (
        <BannerBoard
          placement="HOME_PROMO"
          rows={promotions}
          form={bannerForm?.placement === "HOME_PROMO" ? bannerForm : null}
          onChange={setBannerForm}
          onSave={() => void saveBanner()}
          onCancel={() => setBannerForm(null)}
          onMove={(index, direction) => void reorder("banner", "HOME_PROMO", moveItem(promotions, index, direction).map((item) => item.id))}
          onConfirm={setConfirm}
        />
      ) : null}
      {!loading && !error && tab === "sections" ? (
        <SectionBoard
          rows={data?.sections ?? []}
          categories={data?.categories ?? []}
          services={data?.services ?? []}
          form={sectionForm}
          onChange={setSectionForm}
          onSave={() => void saveSection()}
          onCancel={() => setSectionForm(null)}
          onMove={(index, direction) => void reorder("section", null, moveItem(data?.sections ?? [], index, direction).map((item) => item.id))}
          onConfirm={setConfirm}
        />
      ) : null}
      {!loading && !error && tab === "preview" ? (
        <div className="grid gap-4">
          <div className="flex gap-2">
            <TabButton selected={previewLocale === "en"} onClick={() => setPreviewLocale("en")}>English</TabButton>
            <TabButton selected={previewLocale === "ar"} onClick={() => setPreviewLocale("ar")}>العربية</TabButton>
          </div>
          <HomepagePreview locale={previewLocale} now={now} hero={previewHero} promotions={previewPromos} sections={previewSections} services={data?.services ?? []} />
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === "delete" ? "Delete this item" : confirm?.isActive ? "Activate this item" : "Deactivate this item"}
        body={confirm?.action === "delete" ? `${confirm.name} will be removed from the homepage.` : `${confirm?.name ?? "This item"} will stay saved.`}
        confirmLabel={confirm?.action === "delete" ? "Delete" : "Confirm"}
        cancelLabel="Cancel"
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />
      {toast ? (
        <p role="status" className="fixed right-4 bottom-4 z-[90] max-w-sm rounded-2xl bg-brand-deep px-4 py-3 text-sm text-white">
          {toast}
          <button type="button" className="ml-3 cursor-pointer font-semibold underline" onClick={() => setToast(null)}>Dismiss</button>
        </p>
      ) : null}
    </>
  );
}

function mergeBanner(rows: Banner[], draft: Banner) {
  if (!draft.id) {
    return [...rows, draft];
  }

  return rows.map((row) => (row.id === draft.id ? draft : row));
}

function mergeSection(rows: Section[], draft: Section) {
  if (!draft.id) {
    return [...rows, draft];
  }

  return rows.map((row) => (row.id === draft.id ? draft : row));
}

function blankBanner(placement: Placement, sortOrder: number): Banner {
  return {
    id: "",
    placement,
    desktopImageUrl: null,
    mobileImageUrl: null,
    linkUrl: "",
    isActive: true,
    sortOrder,
    startsAt: "",
    endsAt: "",
    createdAt: "",
    en: { title: "", subtitle: "", buttonLabel: "" },
    ar: { title: "", subtitle: "", buttonLabel: "" },
  };
}

function blankSection(sortOrder: number): Section {
  return {
    id: "",
    type: "FEATURED_SERVICES",
    categoryId: null,
    categoryTitle: null,
    isActive: true,
    sortOrder,
    maxItems: 8,
    serviceIds: [],
    createdAt: "",
    en: { title: "", subtitle: "" },
    ar: { title: "", subtitle: "" },
  };
}

function BannerBoard({
  placement,
  rows,
  form,
  onChange,
  onSave,
  onCancel,
  onMove,
  onConfirm,
}: {
  placement: Placement;
  rows: Banner[];
  form: Banner | null;
  onChange: (banner: Banner) => void;
  onSave: () => void;
  onCancel: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onConfirm: (value: { kind: "banner"; id: string; action: "delete" | "status"; isActive?: boolean; name: string }) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => onChange(blankBanner(placement, rows.length + 1))}>Add banner</Button>
      </div>
      <article className="rounded-2xl border border-line bg-white p-4">
        <DataTable
          columns={[
            { key: "image", header: "Desktop", cell: (row) => <StoredImage src={row.desktopImageUrl} alt="" className="h-12 w-20 rounded-xl" /> },
            { key: "title", header: "Title", cell: (row) => row.en.title },
            { key: "status", header: "Status", cell: (row) => <StatusBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</StatusBadge> },
            { key: "schedule", header: "Schedule", cell: (row) => `${row.startsAt ? row.startsAt.slice(0, 10) : "Now"} – ${row.endsAt ? row.endsAt.slice(0, 10) : "Open"}` },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => {
                const index = rows.findIndex((item) => item.id === row.id);
                return (
                  <div className="flex gap-1">
                    <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp className="size-4" /></IconButton>
                    <IconButton label="Move down" disabled={index === rows.length - 1} onClick={() => onMove(index, 1)}><ArrowDown className="size-4" /></IconButton>
                    <IconButton label={`Edit ${row.en.title}`} onClick={() => onChange({ ...row, startsAt: dateInput(row.startsAt), endsAt: dateInput(row.endsAt), linkUrl: row.linkUrl ?? "" })}><Pencil className="size-4" /></IconButton>
                    <IconButton label={row.isActive ? "Deactivate" : "Activate"} onClick={() => onConfirm({ kind: "banner", id: row.id, action: "status", isActive: !row.isActive, name: row.en.title })}><Power className="size-4" /></IconButton>
                    <IconButton label={`Delete ${row.en.title}`} onClick={() => onConfirm({ kind: "banner", id: row.id, action: "delete", name: row.en.title })}><Trash2 className="size-4" /></IconButton>
                  </div>
                );
              },
            },
          ]}
          rows={rows}
          emptyTitle="No banners yet"
          emptyBody="Add a banner when you have a desktop image and both languages."
        />
      </article>
      {form ? <BannerForm form={form} onChange={onChange} onSave={onSave} onCancel={onCancel} /> : null}
    </div>
  );
}

function BannerForm({ form, onChange, onSave, onCancel }: { form: Banner; onChange: (banner: Banner) => void; onSave: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-lg font-bold">{form.id ? "Edit banner" : "New banner"}</h2>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ImageField label="Desktop image" src={form.desktopImageUrl} onChange={(desktopImageUrl) => onChange({ ...form, desktopImageUrl })} onError={setError} />
        <ImageField label="Mobile image" src={form.mobileImageUrl} onChange={(mobileImageUrl) => onChange({ ...form, mobileImageUrl })} onError={setError} optional />
        <Field label="English title" value={form.en.title} onChange={(title) => onChange({ ...form, en: { ...form.en, title } })} />
        <Field label="العنوان بالعربية" value={form.ar.title} dir="rtl" onChange={(title) => onChange({ ...form, ar: { ...form.ar, title } })} />
        <Field label="English subtitle" value={form.en.subtitle} onChange={(subtitle) => onChange({ ...form, en: { ...form.en, subtitle } })} />
        <Field label="العنوان الفرعي بالعربية" value={form.ar.subtitle} dir="rtl" onChange={(subtitle) => onChange({ ...form, ar: { ...form.ar, subtitle } })} />
        <Field label="English button label" value={form.en.buttonLabel ?? ""} onChange={(buttonLabel) => onChange({ ...form, en: { ...form.en, buttonLabel } })} />
        <Field label="نص الزر بالعربية" value={form.ar.buttonLabel ?? ""} dir="rtl" onChange={(buttonLabel) => onChange({ ...form, ar: { ...form.ar, buttonLabel } })} />
        <Field
          label="Destination URL"
          hint="Enter a website URL, an internal path, or a same-page anchor such as #service-categories."
          value={form.linkUrl ?? ""}
          onChange={(linkUrl) => onChange({ ...form, linkUrl })}
        />
        <Field label="Sort order" value={String(form.sortOrder)} onChange={(value) => onChange({ ...form, sortOrder: Number(value) || 1 })} />
        <Field label="Starts" value={form.startsAt ?? ""} type="datetime-local" onChange={(startsAt) => onChange({ ...form, startsAt })} />
        <Field label="Ends" value={form.endsAt ?? ""} type="datetime-local" onChange={(endsAt) => onChange({ ...form, endsAt })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-4 cursor-pointer" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} />
          Active
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={onSave}>Save banner</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

function SectionBoard({
  rows,
  categories,
  services,
  form,
  onChange,
  onSave,
  onCancel,
  onMove,
  onConfirm,
}: {
  rows: Section[];
  categories: CategoryOption[];
  services: ServiceOption[];
  form: Section | null;
  onChange: (section: Section) => void;
  onSave: () => void;
  onCancel: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onConfirm: (value: { kind: "section"; id: string; action: "delete" | "status"; isActive?: boolean; name: string }) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => onChange(blankSection(rows.length + 1))}>Add section</Button>
      </div>
      <article className="rounded-2xl border border-line bg-white p-4">
        <DataTable
          columns={[
            { key: "title", header: "Title", cell: (row) => row.en.title },
            { key: "type", header: "Type", cell: (row) => sectionLabels[row.type as SectionType] },
            { key: "status", header: "Status", cell: (row) => <StatusBadge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</StatusBadge> },
            { key: "items", header: "Items", cell: (row) => (row.type === "FEATURED_CATEGORIES" ? row.categoryTitle ?? "—" : String(row.serviceIds.length)) },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => {
                const index = rows.findIndex((item) => item.id === row.id);
                return (
                  <div className="flex gap-1">
                    <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}><ArrowUp className="size-4" /></IconButton>
                    <IconButton label="Move down" disabled={index === rows.length - 1} onClick={() => onMove(index, 1)}><ArrowDown className="size-4" /></IconButton>
                    <IconButton label={`Edit ${row.en.title}`} onClick={() => onChange(row)}><Pencil className="size-4" /></IconButton>
                    <IconButton label={row.isActive ? "Deactivate" : "Activate"} onClick={() => onConfirm({ kind: "section", id: row.id, action: "status", isActive: !row.isActive, name: row.en.title })}><Power className="size-4" /></IconButton>
                    <IconButton label={`Delete ${row.en.title}`} onClick={() => onConfirm({ kind: "section", id: row.id, action: "delete", name: row.en.title })}><Trash2 className="size-4" /></IconButton>
                  </div>
                );
              },
            },
          ]}
          rows={rows}
          emptyTitle="No homepage sections yet"
          emptyBody="Add a section to feature a category or a chosen set of published services."
        />
      </article>
      {form ? <SectionForm form={form} categories={categories} services={services} onChange={onChange} onSave={onSave} onCancel={onCancel} /> : null}
    </div>
  );
}

function SectionForm({
  form,
  categories,
  services,
  onChange,
  onSave,
  onCancel,
}: {
  form: Section;
  categories: CategoryOption[];
  services: ServiceOption[];
  onChange: (section: Section) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const needsCategory = form.type === "FEATURED_CATEGORIES" || form.type === "CATEGORY_SERVICES";
  const needsServices = form.type !== "FEATURED_CATEGORIES";
  const choices = services.filter((service) => form.type !== "CATEGORY_SERVICES" || service.categoryId === form.categoryId);
  const selected = form.serviceIds.flatMap((id) => {
    const service = services.find((item) => item.id === id);
    return service ? [service] : [];
  });

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-lg font-bold">{form.id ? "Edit section" : "New section"}</h2>
      <p className="mt-2 text-sm text-muted">A featured category section highlights one active category. Service sections use published services and one price each.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Section type
          <select
            className={`${fieldClass} mt-1`}
            value={form.type}
            onChange={(event) => onChange({ ...form, type: event.target.value as SectionType, categoryId: null, categoryTitle: null, serviceIds: [] })}
          >
            {Object.entries(sectionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {needsCategory ? (
          <label className="text-sm font-semibold">
            Category
            <select className={`${fieldClass} mt-1`} value={form.categoryId ?? ""} onChange={(event) => {
              const category = categories.find((item) => item.id === event.target.value);
              onChange({ ...form, categoryId: event.target.value || null, categoryTitle: category?.title ?? null, serviceIds: [] });
            }}>
              <option value="">Choose a category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
            </select>
          </label>
        ) : null}
        <Field label="English title" value={form.en.title} onChange={(title) => onChange({ ...form, en: { ...form.en, title } })} />
        <Field label="العنوان بالعربية" value={form.ar.title} dir="rtl" onChange={(title) => onChange({ ...form, ar: { ...form.ar, title } })} />
        <Field label="English subtitle" value={form.en.subtitle} onChange={(subtitle) => onChange({ ...form, en: { ...form.en, subtitle } })} />
        <Field label="العنوان الفرعي بالعربية" value={form.ar.subtitle} dir="rtl" onChange={(subtitle) => onChange({ ...form, ar: { ...form.ar, subtitle } })} />
        {needsServices ? <Field label="Maximum items" value={String(form.maxItems)} onChange={(value) => onChange({ ...form, maxItems: Number(value) || 1 })} /> : null}
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-4 cursor-pointer" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} />
          Active
        </label>
      </div>
      {needsServices ? (
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">
            Add a published service
            <select
              className={`${fieldClass} mt-1`}
              value=""
              onChange={(event) => {
                if (!event.target.value || form.serviceIds.includes(event.target.value)) {
                  return;
                }

                onChange({ ...form, serviceIds: [...form.serviceIds, event.target.value] });
              }}
            >
              <option value="">Choose a service</option>
              {choices.filter((service) => !form.serviceIds.includes(service.id)).map((service) => (
                <option key={service.id} value={service.id}>{service.name} · {service.price} {service.currency}</option>
              ))}
            </select>
          </label>
          {selected.map((service, index) => (
            <div key={service.id} className="flex items-center gap-3 rounded-2xl border border-line p-2">
              <StoredImage src={service.coverImageUrl} alt="" className="size-12 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-muted">{service.price} {service.currency}</p>
              </div>
              <IconButton label="Move service up" disabled={index === 0} onClick={() => onChange({ ...form, serviceIds: moveItem(form.serviceIds, index, -1) })}><ArrowUp className="size-4" /></IconButton>
              <IconButton label="Move service down" disabled={index === selected.length - 1} onClick={() => onChange({ ...form, serviceIds: moveItem(form.serviceIds, index, 1) })}><ArrowDown className="size-4" /></IconButton>
              <IconButton label={`Remove ${service.name}`} onClick={() => onChange({ ...form, serviceIds: form.serviceIds.filter((id) => id !== service.id) })}><Trash2 className="size-4" /></IconButton>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={onSave}>Save section</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </section>
  );
}

function TabButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={selected} onClick={onClick} className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold ${selected ? "bg-brand text-white" : "border border-line bg-white"}`}>
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "rtl";
  type?: string;
  hint?: string;
}) {
  return (
    <label className="text-sm font-semibold" dir={dir}>
      {label}
      <input className={`${fieldClass} mt-1`} type={type} value={value} dir={dir} onChange={(event) => onChange(event.target.value)} />
      {hint ? <span className="mt-1 block text-xs font-normal leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}

function ImageField({ label, src, onChange, onError, optional }: { label: string; src: string | null; onChange: (value: string | null) => void; onError: (message: string) => void; optional?: boolean }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <StoredImage src={src} alt="" className="mt-2 aspect-[16/7] w-full rounded-2xl" />
      <div className="mt-2 flex gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">
          {src ? "Replace" : "Upload"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              readImage(file, onChange, onError);
            }
          }} />
        </label>
        {optional && src ? <Button type="button" variant="secondary" onClick={() => onChange(null)}>Remove</Button> : null}
      </div>
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-canvas-muted disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}
