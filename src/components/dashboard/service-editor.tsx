"use client";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import { ServicePreview } from "@/components/dashboard/service-preview";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { StoredImage } from "@/components/ui/stored-image";
import { emptyDocument, type RichNode } from "@/features/services/rich-text";
import { commonCurrencies } from "@/validations/service";
import { ArrowDown, ArrowLeft, ArrowUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Copy = { name: string; shortDescription: string; detailedDescription: RichNode };
type GalleryItem = { key: string; image: string; altText: string };

type ServicePayload = {
  id: string;
  categoryId: string;
  category: { id: string; title: string; isActive: boolean };
  coverImageUrl: string | null;
  basePrice: string;
  currency: string;
  loyaltyPoints: number;
  isFeatured: boolean;
  sortOrder: number;
  status: "draft" | "published" | "inactive";
  ratingAverage: number | null;
  reviewCount: number;
  en: Copy;
  ar: Copy;
  gallery: Array<{ imageUrl: string; altText: string }>;
  message?: string;
};

const fieldClass = "h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm";

function blankCopy(): Copy {
  return {
    name: "",
    shortDescription: "",
    detailedDescription: structuredClone(emptyDocument),
  };
}

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

export function ServiceEditor({ serviceId, readOnly }: { serviceId?: string; readOnly?: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(!serviceId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<"en" | "ar" | null>(null);
  const [descriptionTab, setDescriptionTab] = useState<"en" | "ar">("en");
  const [categories, setCategories] = useState<Array<{ id: string; title: string }>>([]);
  const [status, setStatus] = useState<"draft" | "published" | "inactive">("draft");
  const [ratingAverage, setRatingAverage] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");
  const [currency, setCurrency] = useState("JOD");
  const [customCurrency, setCustomCurrency] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState("1");
  const [en, setEn] = useState<Copy>(blankCopy);
  const [ar, setAr] = useState<Copy>(blankCopy);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [categoryResponse, serviceResponse] = await Promise.all([
        fetch("/api/admin/categories?view=options"),
        serviceId ? fetch(`/api/admin/services/${serviceId}`) : Promise.resolve(null),
      ]);
      const categoryPayload = (await categoryResponse.json()) as { options?: Array<{ id: string; title: string }>; message?: string };
      const service = serviceResponse ? ((await serviceResponse.json()) as ServicePayload) : null;

      if (cancelled) {
        return;
      }

      const options = categoryPayload.options ?? [];

      if (service && !serviceResponse?.ok) {
        setError(service.message ?? "That service could not be opened.");
        setReady(true);
        return;
      }

      if (service?.category && !options.some((item) => item.id === service.category.id)) {
        options.unshift({ id: service.category.id, title: service.category.title });
      }

      setCategories(options);

      if (service && serviceResponse?.ok) {
        setStatus(service.status);
        setRatingAverage(service.ratingAverage);
        setReviewCount(service.reviewCount);
        setCategoryId(service.categoryId);
        setCover(service.coverImageUrl);
        setBasePrice(service.basePrice);
        setLoyaltyPoints(String(service.loyaltyPoints ?? 0));
        setCurrency(service.currency);
        setCustomCurrency(!commonCurrencies.includes(service.currency as (typeof commonCurrencies)[number]));
        setIsFeatured(service.isFeatured);
        setSortOrder(String(service.sortOrder));
        setEn(service.en);
        setAr(service.ar);
        setGallery(service.gallery.map((item) => ({ key: crypto.randomUUID(), image: item.imageUrl, altText: item.altText })));
      } else if (!serviceId) {
        setStatus("draft");
        setRatingAverage(null);
        setReviewCount(0);
        setCategoryId("");
        setCover(null);
        setBasePrice("");
        setLoyaltyPoints("0");
        setCurrency("JOD");
        setCustomCurrency(false);
        setIsFeatured(false);
        setSortOrder("1");
        setEn(blankCopy());
        setAr(blankCopy());
        setGallery([]);
        setPreview(null);
        setToast(null);
      }

      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  function body(intent: "draft" | "publish" | "keep") {
    return {
      categoryId,
      sku: null,
      cover,
      basePrice,
      loyaltyPoints,
      compareAtPrice: null,
      currency,
      isFeatured,
      sortOrder,
      intent,
      en,
      ar,
      gallery: gallery.map((item) => ({ image: item.image, altText: item.altText })),
      packages: [],
    };
  }

  async function deactivate() {
    if (!serviceId) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch(`/api/admin/services/${serviceId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate" }),
    });
    const payload = (await response.json()) as { status?: "draft" | "published" | "inactive"; message?: string };
    setPending(false);

    if (!response.ok || !payload.status) {
      setError(payload.message ?? "The service could not be deactivated.");
      return;
    }

    setStatus(payload.status);
    setToast("Service deactivated.");
  }

  async function save(intent: "draft" | "publish" | "keep") {
    setPending(true);
    setError(null);
    const response = await fetch(serviceId ? `/api/admin/services/${serviceId}` : "/api/admin/services", {
      method: serviceId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body(intent)),
    });
    const payload = (await response.json()) as ServicePayload;
    setPending(false);

    if (!response.ok) {
      setError(payload.message ?? "The service could not be saved.");
      return;
    }

    setToast(intent === "publish" ? "Service published." : "Service saved.");

    if (!serviceId) {
      router.replace(`/admin/services?created=${Date.now()}`);
      router.refresh();
      return;
    }

    setStatus(payload.status);
    setCover(payload.coverImageUrl);
  }

  function move<T>(items: T[], index: number, direction: -1 | 1) {
    const next = index + direction;

    if (next < 0 || next >= items.length) {
      return items;
    }

    const copy = [...items];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    return copy;
  }

  if (!ready) {
    return <p className="text-sm text-muted">Loading service…</p>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/services" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft className="size-4" />
          Services
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={status === "published" ? "success" : status === "inactive" ? "neutral" : "warning"}>
            {status === "published" ? "Published" : status === "inactive" ? "Inactive" : "Draft"}
          </StatusBadge>
          <Button type="button" variant="secondary" onClick={() => setPreview((current) => (current === "en" ? null : "en"))}>
            English preview
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPreview((current) => (current === "ar" ? null : "ar"))}>
            Arabic preview
          </Button>
        </div>
      </div>
      {error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      {preview ? (
        <ServicePreview
          locale={preview}
          name={preview === "ar" ? ar.name : en.name}
          shortDescription={preview === "ar" ? ar.shortDescription : en.shortDescription}
          description={preview === "ar" ? ar.detailedDescription : en.detailedDescription}
          cover={cover}
          gallery={gallery}
          price={basePrice}
          currency={currency}
          ratingAverage={ratingAverage}
          reviewCount={reviewCount}
        />
      ) : null}
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Basic information</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Service name in English" value={en.name} disabled={readOnly} onChange={(value) => setEn({ ...en, name: value })} />
          <Field label="اسم الخدمة بالعربية" value={ar.name} disabled={readOnly} dir="rtl" onChange={(value) => setAr({ ...ar, name: value })} />
          <label className="text-sm font-semibold">
            Category
            <select className={`${fieldClass} mt-1`} value={categoryId} disabled={readOnly} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Short description in English
            <textarea className="mt-1 min-h-24 w-full rounded-2xl border border-line px-3 py-2 text-sm" value={en.shortDescription} disabled={readOnly} onChange={(event) => setEn({ ...en, shortDescription: event.target.value })} />
          </label>
          <label className="text-sm font-semibold md:col-span-2" dir="rtl">
            الوصف المختصر بالعربية
            <textarea className="mt-1 min-h-24 w-full rounded-2xl border border-line px-3 py-2 text-sm" dir="rtl" value={ar.shortDescription} disabled={readOnly} onChange={(event) => setAr({ ...ar, shortDescription: event.target.value })} />
          </label>
          <Field label="Sort order" value={sortOrder} disabled={readOnly} onChange={setSortOrder} />
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 cursor-pointer" checked={isFeatured} disabled={readOnly} onChange={(event) => setIsFeatured(event.target.checked)} />
            Featured service
          </label>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Images</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[16rem_1fr]">
          <div>
            <p className="text-sm font-semibold">Cover image</p>
            <StoredImage src={cover} alt="" className="mt-2 aspect-[4/3] w-full rounded-2xl" />
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">
                {cover ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={readOnly}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) {
                      readImage(file, setCover, setError);
                    }
                  }}
                />
              </label>
              {cover ? (
                <Button type="button" variant="secondary" disabled={readOnly} onClick={() => setCover(null)}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Gallery ({gallery.length}/10)</p>
              <label className={`inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold ${gallery.length >= 10 || readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                Add images
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="sr-only"
                  disabled={readOnly || gallery.length >= 10}
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])].slice(0, 10 - gallery.length);
                    event.target.value = "";
                    files.forEach((file) => {
                      readImage(file, (image) => setGallery((current) => (current.length >= 10 ? current : [...current, { key: crypto.randomUUID(), image, altText: "" }])), setError);
                    });
                  }}
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3">
              {gallery.map((item, index) => (
                <div key={item.key} className="grid gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[4.5rem_1fr_auto]">
                  <StoredImage src={item.image} alt={item.altText} className="size-16 rounded-xl" />
                  <label className="text-sm font-semibold">
                    Alt text · position {index + 1}
                    <input className={`${fieldClass} mt-1`} value={item.altText} disabled={readOnly} onChange={(event) => setGallery((current) => current.map((row) => (row.key === item.key ? { ...row, altText: event.target.value } : row)))} />
                  </label>
                  <div className="flex gap-1">
                    <IconButton label="Move image up" disabled={readOnly || index === 0} onClick={() => setGallery((current) => move(current, index, -1))}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="Move image down" disabled={readOnly || index === gallery.length - 1} onClick={() => setGallery((current) => move(current, index, 1))}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <label className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-canvas-muted" title="Replace image">
                      <span className="sr-only">Replace image {index + 1}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={readOnly}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) {
                            readImage(file, (image) => setGallery((current) => current.map((row) => (row.key === item.key ? { ...row, image } : row))), setError);
                          }
                        }}
                      />
                      ↑
                    </label>
                    <IconButton label={`Remove image ${index + 1}`} disabled={readOnly} onClick={() => setGallery((current) => current.filter((row) => row.key !== item.key))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="flex gap-2" role="tablist" aria-label="Description language">
          <button type="button" role="tab" aria-selected={descriptionTab === "en"} className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold ${descriptionTab === "en" ? "bg-brand text-white" : "border border-line"}`} onClick={() => setDescriptionTab("en")}>
            English description
          </button>
          <button type="button" role="tab" aria-selected={descriptionTab === "ar"} className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold ${descriptionTab === "ar" ? "bg-brand text-white" : "border border-line"}`} onClick={() => setDescriptionTab("ar")}>
            الوصف العربي
          </button>
        </div>
        <div className={descriptionTab === "en" ? "mt-4" : "hidden"}>
          <RichTextEditor dir="ltr" editable={!readOnly} content={en.detailedDescription} onChange={(document) => setEn((current) => ({ ...current, detailedDescription: document as RichNode }))} />
        </div>
        <div className={descriptionTab === "ar" ? "mt-4" : "hidden"} dir="rtl">
          <RichTextEditor dir="rtl" editable={!readOnly} content={ar.detailedDescription} onChange={(document) => setAr((current) => ({ ...current, detailedDescription: document as RichNode }))} />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Pricing</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Price" value={basePrice} disabled={readOnly} onChange={setBasePrice} />
          <Field label="Loyalty points" value={loyaltyPoints} disabled={readOnly} onChange={(value) => setLoyaltyPoints(value.replace(/\D/g, "").slice(0, 7))} />
          <p className="text-sm text-muted md:col-span-2">Points the customer earns for each unit of this service that is purchased.</p>
          <label className="text-sm font-semibold">
            Currency
            <select
              className={`${fieldClass} mt-1`}
              disabled={readOnly}
              value={customCurrency ? "OTHER" : currency}
              onChange={(event) => {
                if (event.target.value === "OTHER") {
                  setCustomCurrency(true);
                  setCurrency("");
                  return;
                }

                setCustomCurrency(false);
                setCurrency(event.target.value);
              }}
            >
              {commonCurrencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
              <option value="OTHER">Other ISO code</option>
            </select>
          </label>
          {customCurrency ? <Field label="ISO currency code" value={currency} disabled={readOnly} onChange={(value) => setCurrency(value.toUpperCase())} /> : null}
        </div>
      </section>
      {readOnly ? null : (
        <div className="flex flex-wrap gap-2">
          {status === "draft" ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void save("draft")}>
              Save draft
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => void save("keep")}>
              Save
            </Button>
          )}
          {status !== "published" ? (
            <Button type="button" disabled={pending} onClick={() => void save("publish")}>
              {status === "inactive" ? "Reactivate" : "Publish"}
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDeactivate(true)}>
              Deactivate
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate service"
        body="The service will stay saved with its images and description. It will no longer be available to customers."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => {
          setConfirmDeactivate(false);
          void deactivate();
        }}
      />
      {toast ? (
        <p role="status" className="fixed right-4 bottom-4 z-[90] max-w-sm rounded-2xl bg-brand-deep px-4 py-3 text-sm text-white">
          {toast}
          <button type="button" className="ml-3 cursor-pointer font-semibold underline" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, disabled, dir }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; dir?: "rtl" | "ltr" }) {
  return (
    <label className="text-sm font-semibold" dir={dir}>
      {label}
      <input className={`${fieldClass} mt-1`} value={value} disabled={disabled} dir={dir} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-canvas-muted disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}
