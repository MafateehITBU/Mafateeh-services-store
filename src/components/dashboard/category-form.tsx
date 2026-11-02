"use client";

import { Button } from "@/components/ui/button";
import { StoredImage } from "@/components/ui/stored-image";
import { categoryInputSchema } from "@/validations/category";
import { useEffect, useState } from "react";

export type CategoryDetail = {
  id: string;
  slug: string;
  iconImageUrl: string | null;
  bannerImageUrl: string;
  isActive: boolean;
  sortOrder: number;
  en: { title: string; description: string | null; seoTitle: string | null; seoDescription: string | null } | null;
  ar: { title: string; description: string | null; seoTitle: string | null; seoDescription: string | null } | null;
};

type FormValues = {
  image: string;
  banner: string;
  sortOrder: string;
  isActive: boolean;
  enTitle: string;
  enDescription: string;
  enSeoTitle: string;
  enSeoDescription: string;
  arTitle: string;
  arDescription: string;
  arSeoTitle: string;
  arSeoDescription: string;
};

const emptyValues: FormValues = {
  image: "",
  banner: "",
  sortOrder: "1",
  isActive: true,
  enTitle: "",
  enDescription: "",
  enSeoTitle: "",
  enSeoDescription: "",
  arTitle: "",
  arDescription: "",
  arSeoTitle: "",
  arSeoDescription: "",
};

function valuesFromCategory(category: CategoryDetail): FormValues {
  return {
    image: category.iconImageUrl ?? "",
    banner: category.bannerImageUrl,
    sortOrder: String(Math.max(1, category.sortOrder)),
    isActive: category.isActive,
    enTitle: category.en?.title ?? "",
    enDescription: category.en?.description ?? "",
    enSeoTitle: category.en?.seoTitle ?? "",
    enSeoDescription: category.en?.seoDescription ?? "",
    arTitle: category.ar?.title ?? "",
    arDescription: category.ar?.description ?? "",
    arSeoTitle: category.ar?.seoTitle ?? "",
    arSeoDescription: category.ar?.seoDescription ?? "",
  };
}

export function CategoryForm({
  category,
  readOnly,
  onClose,
  onSaved,
}: {
  category: CategoryDetail | null;
  readOnly: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState<FormValues>(category ? valuesFromCategory(category) : emptyValues);
  const [section, setSection] = useState<"general" | "english" | "arabic">("general");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function update(patch: Partial<FormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function chooseImage(field: "image" | "banner", file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be PNG, JPEG, or WebP files up to 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
        setError("Images must be PNG, JPEG, or WebP files up to 5 MB.");
        return;
      }

      update({ [field]: reader.result.replace(/^data:image\/jpg;/, "data:image/jpeg;") });
      setError(null);
    };
    reader.onerror = () => setError("The image could not be read.");
    reader.readAsDataURL(file);
  }

  async function save() {
    const parsed = categoryInputSchema.safeParse({
      image: values.image,
      banner: values.banner,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
      en: {
        title: values.enTitle,
        description: values.enDescription,
        seoTitle: values.enSeoTitle,
        seoDescription: values.enSeoDescription,
      },
      ar: {
        title: values.arTitle,
        description: values.arDescription,
        seoTitle: values.arSeoTitle,
        seoDescription: values.arSeoDescription,
      },
    });

    if (!parsed.success) {
      setError("Add the English and Arabic names and descriptions, a sort order from 1, and a banner image.");
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
      method: category ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const payload = (await response.json()) as { message?: string };
    setPending(false);

    if (!response.ok) {
      setError(payload.message ?? "The category could not be saved.");
      return;
    }

    onSaved(category ? "Category updated." : "Category created.");
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close category form" className="absolute inset-0 cursor-pointer bg-brand-deep/45" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="category-form-title" className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[var(--shadow-panel)]">
        <div className="flex items-start justify-between gap-4">
          <h2 id="category-form-title" className="text-xl font-bold">
            {readOnly ? "Category details" : category ? "Edit category" : "Add category"}
          </h2>
          <button type="button" aria-label="Close" className="cursor-pointer rounded-full px-3 py-2 text-sm font-semibold" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {(["general", "english", "arabic"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={section === item}
              onClick={() => setSection(item)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${section === item ? "bg-brand text-white" : "bg-canvas-muted text-ink"}`}
            >
              {item === "general" ? "General" : item === "english" ? "English" : "العربية"}
            </button>
          ))}
        </div>
        {error ? <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
        {section === "general" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ImageField label="Image" url={values.image} readOnly={readOnly} onUpload={(file) => chooseImage("image", file)} onRemove={() => update({ image: "" })} />
            <ImageField label="Banner image" wide url={values.banner} readOnly={readOnly} onUpload={(file) => chooseImage("banner", file)} onRemove={() => update({ banner: "" })} />
            <label className="text-sm font-semibold">
              Sort order
              <input
                disabled={readOnly}
                type="number"
                min={1}
                value={values.sortOrder}
                onChange={(event) => update({ sortOrder: event.target.value })}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas-muted px-3"
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                disabled={readOnly}
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => update({ isActive: event.target.checked })}
              />
              Active
            </label>
          </div>
        ) : null}
        {section === "english" ? (
          <TranslationFields
            readOnly={readOnly}
            title={values.enTitle}
            description={values.enDescription}
            seoTitle={values.enSeoTitle}
            seoDescription={values.enSeoDescription}
            onChange={(patch) =>
              update({
                enTitle: patch.title ?? values.enTitle,
                enDescription: patch.description ?? values.enDescription,
                enSeoTitle: patch.seoTitle ?? values.enSeoTitle,
                enSeoDescription: patch.seoDescription ?? values.enSeoDescription,
              })
            }
          />
        ) : null}
        {section === "arabic" ? (
          <div dir="rtl">
            <TranslationFields
              readOnly={readOnly}
              labels={{ title: "الاسم", description: "الوصف", seoTitle: "عنوان تحسين البحث", seoDescription: "وصف تحسين البحث" }}
              title={values.arTitle}
              description={values.arDescription}
              seoTitle={values.arSeoTitle}
              seoDescription={values.arSeoDescription}
              onChange={(patch) =>
                update({
                  arTitle: patch.title ?? values.arTitle,
                  arDescription: patch.description ?? values.arDescription,
                  arSeoTitle: patch.seoTitle ?? values.arSeoTitle,
                  arSeoDescription: patch.seoDescription ?? values.arSeoDescription,
                })
              }
            />
          </div>
        ) : null}
        {readOnly ? null : (
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving" : "Save category"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TranslationFields({
  title,
  description,
  seoTitle,
  seoDescription,
  readOnly,
  labels = { title: "Name", description: "Description", seoTitle: "SEO title", seoDescription: "SEO description" },
  onChange,
}: {
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  readOnly: boolean;
  labels?: { title: string; description: string; seoTitle: string; seoDescription: string };
  onChange: (patch: Partial<{ title: string; description: string; seoTitle: string; seoDescription: string }>) => void;
}) {
  return (
    <div className="mt-5 grid gap-4">
      <Field label={labels.title} value={title} readOnly={readOnly} onChange={(value) => onChange({ title: value })} />
      <label className="text-sm font-semibold">
        {labels.description}
        <textarea
          disabled={readOnly}
          value={description}
          onChange={(event) => onChange({ description: event.target.value })}
          className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-canvas-muted px-3 py-3"
        />
      </label>
      <Field label={labels.seoTitle} value={seoTitle} readOnly={readOnly} onChange={(value) => onChange({ seoTitle: value })} />
      <Field label={labels.seoDescription} value={seoDescription} readOnly={readOnly} onChange={(value) => onChange({ seoDescription: value })} />
    </div>
  );
}

function Field({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        disabled={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-line bg-canvas-muted px-3"
      />
    </label>
  );
}

function ImageField({
  label,
  url,
  wide = false,
  readOnly,
  onUpload,
  onRemove,
}: {
  label: string;
  url: string;
  wide?: boolean;
  readOnly: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="text-sm font-semibold">
      {label}
      <StoredImage src={url || null} alt={label} className={`mt-2 w-full rounded-2xl ${wide ? "h-32" : "h-20"}`} />
      {readOnly ? null : (
        <div className="mt-2 flex gap-2">
          <label className="cursor-pointer rounded-full border border-line px-3 py-2 text-xs">
            {url ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUpload(file);
                }
                event.target.value = "";
              }}
            />
          </label>
          {url ? (
            <button type="button" className="cursor-pointer rounded-full border border-line px-3 py-2 text-xs" onClick={onRemove}>
              Remove
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
