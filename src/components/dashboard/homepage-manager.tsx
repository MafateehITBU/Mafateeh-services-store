"use client";

import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LoadingState } from "@/components/dashboard/loading-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { StoredImage } from "@/components/ui/stored-image";
import { bannerDestinationError, isSafeBannerDestination } from "@/features/homepage/banner-destination";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Placement = "HOME_HERO" | "HOME_PROMO";
type SectionType = "FEATURED_CATEGORIES" | "FEATURED_SERVICES" | "CATEGORY_SERVICES" | "CUSTOM_SERVICES";
type BlockType = "HERO_CAROUSEL" | "PROMOTIONAL_BANNER" | "CATEGORY_CAROUSEL" | "HOME_SECTION" | "TESTIMONIAL_CAROUSEL";
type Copy = { title: string; subtitle: string; buttonLabel?: string };
type Banner = {
  id: string;
  placement: Placement;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  en: Copy;
  ar: Copy;
};
type Section = {
  id: string;
  type: SectionType;
  categoryId: string | null;
  categoryTitle: string | null;
  isActive: boolean;
  sortOrder: number;
  maxItems: number;
  serviceIds: string[];
  createdAt: string;
  en: { title: string; subtitle: string };
  ar: { title: string; subtitle: string };
};
type LayoutBlock = { id: string; type: BlockType; bannerId: string | null; sectionId: string | null; isVisible: boolean; sortOrder: number };
type ServiceOption = { id: string; categoryId: string; name: string; category: string; price: string; currency: string; coverImageUrl: string | null };
type CategoryOption = { id: string; title: string };
type HomepagePayload = { banners: Banner[]; sections: Section[]; categories: CategoryOption[]; services: ServiceOption[]; layout: LayoutBlock[]; approvedReviewCount: number; message?: string };
type Editor = { mode: "banner"; banner: Banner } | { mode: "section"; section: Section } | { mode: "info"; type: "CATEGORY_CAROUSEL" | "TESTIMONIAL_CAROUSEL" } | null;
type ConfirmState = { kind: "banner" | "section" | "layout"; id: string; action: "delete" | "status"; isActive?: boolean; name: string } | null;

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
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

function blankBanner(placement: Placement, sortOrder: number): Banner {
  return { id: "", placement, desktopImageUrl: null, mobileImageUrl: null, linkUrl: "", isActive: true, sortOrder, startsAt: "", endsAt: "", createdAt: "", en: { title: "", subtitle: "", buttonLabel: "" }, ar: { title: "", subtitle: "", buttonLabel: "" } };
}

function blankSection(sortOrder: number): Section {
  return { id: "", type: "FEATURED_SERVICES", categoryId: null, categoryTitle: null, isActive: true, sortOrder, maxItems: 8, serviceIds: [], createdAt: "", en: { title: "", subtitle: "" }, ar: { title: "", subtitle: "" } };
}

export function HomepageManager() {
  const [previewLocale, setPreviewLocale] = useState<"en" | "ar">("en");
  const [data, setData] = useState<HomepagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [orderState, setOrderState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editor, setEditor] = useState<Editor>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = useCallback(async () => {
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

  async function persistOrder(ids: string[]) {
    setOrderState("saving");
    const response = await fetch("/api/admin/homepage/layout/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setOrderState("error");
      setToast(payload.message ?? "The order could not be saved.");
      await load();
      return;
    }
    setOrderState("saved");
    setToast("Homepage order saved.");
  }

  function reorder(next: LayoutBlock[]) {
    if (!data) return;
    setData({ ...data, layout: next.map((item, index) => ({ ...item, sortOrder: index + 1 })) });
    void persistOrder(next.map((item) => item.id));
  }

  function onDragEnd(event: DragEndEvent) {
    if (!data || !event.over || event.active.id === event.over.id) return;
    const oldIndex = data.layout.findIndex((item) => item.id === event.active.id);
    const newIndex = data.layout.findIndex((item) => item.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorder(arrayMove(data.layout, oldIndex, newIndex));
  }

  async function saveBanner(banner: Banner) {
    const destination = banner.linkUrl?.trim() ?? "";
    if (destination && !isSafeBannerDestination(destination)) {
      setToast(bannerDestinationError);
      return;
    }
    const response = await fetch(banner.id ? `/api/admin/homepage/banners/${banner.id}` : "/api/admin/homepage/banners", {
      method: banner.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placement: banner.placement, desktop: banner.desktopImageUrl, mobile: banner.mobileImageUrl, linkUrl: banner.linkUrl, isActive: banner.isActive, sortOrder: banner.sortOrder, startsAt: banner.startsAt, endsAt: banner.endsAt, en: banner.en, ar: banner.ar }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setToast(payload.message ?? "The banner could not be saved.");
      return;
    }
    setEditor(null);
    setToast("Banner saved.");
    await load();
  }

  async function saveSection(section: Section) {
    const response = await fetch(section.id ? `/api/admin/homepage/sections/${section.id}` : "/api/admin/homepage/sections", {
      method: section.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: section.type, categoryId: section.categoryId, isActive: section.isActive, sortOrder: section.sortOrder, maxItems: section.maxItems, en: section.en, ar: section.ar, serviceIds: section.serviceIds }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setToast(payload.message ?? "The section could not be saved.");
      return;
    }
    setEditor(null);
    setToast("Section saved.");
    await load();
  }

  async function setVisibility(block: LayoutBlock) {
    const response = await fetch(`/api/admin/homepage/layout/${block.id}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !block.isVisible }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setToast(payload.message ?? "The visibility could not be saved.");
      return;
    }
    setToast(block.isVisible ? "Hidden from the homepage." : "Shown on the homepage.");
    await load();
  }

  async function createSingleton(type: "CATEGORY_CAROUSEL" | "TESTIMONIAL_CAROUSEL" | "HERO_CAROUSEL") {
    const response = await fetch("/api/admin/homepage/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setToast(payload.message ?? "The block could not be added.");
      return;
    }
    setToast("Block added.");
    await load();
  }

  async function runConfirm() {
    if (!confirm) return;
    const response = confirm.kind === "layout"
      ? await fetch(`/api/admin/homepage/layout/${confirm.id}`, { method: "DELETE" })
      : confirm.action === "delete"
        ? await fetch(confirm.kind === "banner" ? `/api/admin/homepage/banners/${confirm.id}` : `/api/admin/homepage/sections/${confirm.id}`, { method: "DELETE" })
        : await fetch(`${confirm.kind === "banner" ? "/api/admin/homepage/banners" : "/api/admin/homepage/sections"}/${confirm.id}/status`, {
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

  if (loading) return <LoadingState />;
  if (error || !data) return <EmptyState title="Homepage content is unavailable" body={error ?? "Try again in a moment."} />;

  const hero = data.banners.filter((item) => item.placement === "HOME_HERO");
  const summary = (block: LayoutBlock) => describeBlock(block, data, hero);

  return (
    <div className="homepage-builder">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">{orderState === "saving" ? "Saving order…" : orderState === "saved" ? "Order saved." : orderState === "error" ? "The order was not saved." : "Drag a block or use the arrow buttons."}</p>
        <Button type="button" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add content</Button>
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,32%)]">
        <div className="order-1 grid min-w-0 gap-4">
          <div className="flex gap-2">
            <LocaleButton selected={previewLocale === "en"} onClick={() => setPreviewLocale("en")}>EN</LocaleButton>
            <LocaleButton selected={previewLocale === "ar"} onClick={() => setPreviewLocale("ar")}>AR</LocaleButton>
          </div>
          <div dir={previewLocale === "ar" ? "rtl" : "ltr"} className="grid gap-4 rounded-3xl bg-[#f6faf7] p-4">
            {data.layout.map((block) => (
              <PreviewBlock key={block.id} block={block} locale={previewLocale} data={data} hero={hero} draft={editor} />
            ))}
            {editor?.mode === "banner" && !editor.banner.id ? <PreviewBlock block={{ id: "draft", type: editor.banner.placement === "HOME_HERO" ? "HERO_CAROUSEL" : "PROMOTIONAL_BANNER", bannerId: null, sectionId: null, isVisible: true, sortOrder: 0 }} locale={previewLocale} data={data} hero={editor.banner.placement === "HOME_HERO" ? [...hero, editor.banner] : hero} draft={editor} /> : null}
            {editor?.mode === "section" && !editor.section.id ? <PreviewBlock block={{ id: "draft-section", type: "HOME_SECTION", bannerId: null, sectionId: null, isVisible: true, sortOrder: 0 }} locale={previewLocale} data={{ ...data, sections: [...data.sections, editor.section] }} hero={hero} draft={editor} /> : null}
          </div>
        </div>
        <aside className="order-2 min-w-0 rounded-3xl border border-line bg-white p-3 lg:sticky lg:top-20 lg:max-h-[calc(100svh-6rem)] lg:overflow-x-hidden lg:overflow-y-auto">
          <h2 className="px-2 py-2 text-sm font-bold">Page structure</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={data.layout.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ol className="grid gap-2">
                {data.layout.map((block, index) => (
                  <StructureRow
                    key={block.id}
                    block={block}
                    index={index}
                    count={data.layout.length}
                    summary={summary(block)}
                    onMove={(direction) => reorder(moveItem(data.layout, index, direction))}
                    onEdit={() => {
                      if (block.type === "HERO_CAROUSEL") {
                        const banner = hero[0];
                        setEditor({
                          mode: "banner",
                          banner: banner
                            ? { ...banner, startsAt: dateInput(banner.startsAt), endsAt: dateInput(banner.endsAt), linkUrl: banner.linkUrl ?? "" }
                            : blankBanner("HOME_HERO", 1),
                        });
                        return;
                      }
                      if (block.type === "PROMOTIONAL_BANNER") {
                        const banner = data.banners.find((item) => item.id === block.bannerId);
                        if (banner) {
                          setEditor({ mode: "banner", banner: { ...banner, startsAt: dateInput(banner.startsAt), endsAt: dateInput(banner.endsAt), linkUrl: banner.linkUrl ?? "" } });
                        }
                        return;
                      }
                      if (block.type === "HOME_SECTION") {
                        const section = data.sections.find((item) => item.id === block.sectionId);
                        if (section) {
                          setEditor({ mode: "section", section });
                        }
                        return;
                      }
                      setEditor({ mode: "info", type: block.type });
                    }}
                    onVisibility={() => void setVisibility(block)}
                    onDelete={() => setConfirm({ kind: "layout", id: block.id, action: "delete", name: summary(block).en })}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          {data.layout.length === 0 ? <p className="px-2 py-4 text-sm text-muted">Add a block to start the homepage.</p> : null}
        </aside>
      </div>
      <EditorDialog open={addOpen} title="Add content" onClose={() => setAddOpen(false)}>
        <div className="grid gap-2">
          <AddChoice label="Hero banner" detail={hero.length > 0 ? "The homepage already has its one hero banner. Edit that banner instead." : "One full-width banner under the header."} onClick={() => { setAddOpen(false); if (hero[0]) { setToast("The homepage already has a hero banner."); setEditor({ mode: "banner", banner: { ...hero[0], startsAt: dateInput(hero[0].startsAt), endsAt: dateInput(hero[0].endsAt), linkUrl: hero[0].linkUrl ?? "" } }); return; } setEditor({ mode: "banner", banner: blankBanner("HOME_HERO", 1) }); }} />
          <AddChoice label="Promotional banner" detail="Creates a banner you can place anywhere." onClick={() => { setAddOpen(false); setEditor({ mode: "banner", banner: blankBanner("HOME_PROMO", data.banners.length + 1) }); }} />
          <AddChoice label="Homepage section" detail="Features categories or published services." onClick={() => { setAddOpen(false); setEditor({ mode: "section", section: blankSection(data.sections.length + 1) }); }} />
          <AddChoice label="Category carousel" detail={data.layout.some((item) => item.type === "CATEGORY_CAROUSEL") ? "Already on the homepage. Edit the existing block." : "Shows active categories."} onClick={() => chooseSingleton("CATEGORY_CAROUSEL")} />
          <AddChoice label="Testimonial carousel" detail={data.layout.some((item) => item.type === "TESTIMONIAL_CAROUSEL") ? "Already on the homepage. Edit the existing block." : "Shows approved customer reviews."} onClick={() => chooseSingleton("TESTIMONIAL_CAROUSEL")} />
        </div>
      </EditorDialog>
      <EditorDialog open={Boolean(editor)} title={editorTitle(editor)} onClose={() => setEditor(null)}>
        {editor?.mode === "banner" ? <BannerForm form={editor.banner} onChange={(banner) => setEditor({ mode: "banner", banner })} onSave={() => void saveBanner(editor.banner)} onCancel={() => setEditor(null)} /> : null}
        {editor?.mode === "section" ? <SectionForm form={editor.section} categories={data.categories} services={data.services} onChange={(section) => setEditor({ mode: "section", section })} onSave={() => void saveSection(editor.section)} onCancel={() => setEditor(null)} /> : null}
        {editor?.mode === "info" ? <p className="text-sm leading-6 text-muted">{editor.type === "CATEGORY_CAROUSEL" ? "This carousel uses active categories from the catalog. Reorder or hide the block here. Category names and images are edited in Categories." : "This carousel uses approved reviews. Reorder or hide the block here. Review text is moderated in Reviews."}</p> : null}
      </EditorDialog>
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.action === "delete" ? "Remove this item" : "Change status"} body={confirm?.kind === "layout" ? `${confirm.name} will leave the homepage layout. Saved banners and sections are removed only when that block is their own content. The hero banner stays saved.` : `${confirm?.name ?? "This item"} will be updated.`} confirmLabel={confirm?.action === "delete" ? "Remove" : "Confirm"} cancelLabel="Cancel" onClose={() => setConfirm(null)} onConfirm={() => void runConfirm()} />
      {toast ? <p role="status" className="fixed right-4 bottom-4 z-[90] max-w-sm rounded-2xl bg-brand-deep px-4 py-3 text-sm text-white">{toast}<button type="button" className="ml-3 cursor-pointer font-semibold underline" onClick={() => setToast(null)}>Dismiss</button></p> : null}
    </div>
  );

  function chooseSingleton(type: "CATEGORY_CAROUSEL" | "TESTIMONIAL_CAROUSEL") {
    const existing = data?.layout.find((item) => item.type === type);
    setAddOpen(false);
    if (existing) {
      setToast("This block is already on the homepage. You can move or edit it.");
      setEditor({ mode: "info", type });
      return;
    }
    void createSingleton(type);
  }
}

function editorTitle(editor: Editor) {
  if (!editor) return "";
  if (editor.mode === "banner") return editor.banner.placement === "HOME_HERO" ? "Hero banner" : editor.banner.id ? "Edit banner" : "New banner";
  if (editor.mode === "section") return editor.section.id ? "Edit section" : "New section";
  return editor.type === "CATEGORY_CAROUSEL" ? "Category carousel" : "Testimonial carousel";
}

function describeBlock(block: LayoutBlock, data: HomepagePayload, hero: Banner[]) {
  if (block.type === "HERO_CAROUSEL") return { type: "Hero banner", en: hero[0]?.en.title || "Hero banner", ar: hero[0]?.ar.title || "البانر الرئيسي", detail: hero[0] ? "One banner" : "No banner yet", image: hero[0]?.desktopImageUrl ?? null, inactive: Boolean(hero[0] && !hero[0].isActive) };
  if (block.type === "PROMOTIONAL_BANNER") {
    const banner = data.banners.find((item) => item.id === block.bannerId);
    return { type: "Promotion", en: banner?.en.title || "Promotion", ar: banner?.ar.title || "عرض", detail: banner?.isActive ? "Active content" : "Inactive content", image: banner?.desktopImageUrl ?? null, inactive: !banner?.isActive };
  }
  if (block.type === "HOME_SECTION") {
    const section = data.sections.find((item) => item.id === block.sectionId);
    return { type: section ? sectionLabels[section.type] : "Section", en: section?.en.title || "Section", ar: section?.ar.title || "قسم", detail: section?.type === "FEATURED_CATEGORIES" ? section.categoryTitle ?? "Category" : `${section?.serviceIds.length ?? 0} services`, image: null, inactive: !section?.isActive };
  }
  if (block.type === "CATEGORY_CAROUSEL") return { type: "Category Carousel", en: "Explore Our Solutions", ar: "اكتشف حلولنا", detail: `${data.categories.length} active categories`, image: null, inactive: false };
  return { type: "Testimonials", en: "What Our Customers Say", ar: "آراء عملائنا", detail: "6 static testimonials", image: null, inactive: false };
}

function StructureRow({ block, index, count, summary, onMove, onEdit, onVisibility, onDelete }: { block: LayoutBlock; index: number; count: number; summary: ReturnType<typeof describeBlock>; onMove: (direction: -1 | 1) => void; onEdit: () => void; onVisibility: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`rounded-2xl border bg-white p-3 ${isDragging ? "border-brand shadow-[var(--shadow-soft)]" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <button type="button" className="inline-flex size-10 shrink-0 cursor-grab items-center justify-center rounded-xl hover:bg-canvas-muted" aria-label={`Drag ${summary.en}`} {...attributes} {...listeners}><GripVertical className="size-4" /></button>
        {summary.image ? <StoredImage src={summary.image} alt="" fit="contain" className="size-14 shrink-0 rounded-xl bg-[#f7f4ec]" /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-brand">{summary.type}</p>
          <p className="line-clamp-2 text-sm font-bold leading-5">{summary.en}</p>
          <p className="line-clamp-2 text-xs leading-5 text-muted" dir="rtl">{summary.ar}</p>
          <p className="mt-1 text-xs text-muted">{summary.detail}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="size-4" /></IconButton>
        <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown className="size-4" /></IconButton>
        <IconButton label={block.isVisible ? "Hide from homepage" : "Show on homepage"} onClick={onVisibility}>{block.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</IconButton>
        <IconButton label={`Edit ${summary.en}`} onClick={onEdit}><Pencil className="size-4" /></IconButton>
        <IconButton label={`Remove ${summary.en}`} onClick={onDelete}><Trash2 className="size-4" /></IconButton>
        {!block.isVisible ? <StatusBadge tone="neutral">Hidden</StatusBadge> : null}
        {summary.inactive ? <StatusBadge tone="warning">Inactive</StatusBadge> : null}
      </div>
    </li>
  );
}

function PreviewBlock({ block, locale, data, hero, draft }: { block: LayoutBlock; locale: "en" | "ar"; data: HomepagePayload; hero: Banner[]; draft: Editor }) {
  const copy = locale === "ar" ? "ar" : "en";
  const draftBanner = draft?.mode === "banner" ? draft.banner : null;
  const banner = block.type === "PROMOTIONAL_BANNER"
    ? draftBanner && draftBanner.placement === "HOME_PROMO" && (draftBanner.id === block.bannerId || (!draftBanner.id && block.id === "draft"))
      ? draftBanner
      : data.banners.find((item) => item.id === block.bannerId) ?? null
    : null;
  const section = block.type === "HOME_SECTION"
    ? draft?.mode === "section" && (draft.section.id === block.sectionId || (!draft.section.id && block.id === "draft-section"))
      ? draft.section
      : data.sections.find((item) => item.id === block.sectionId) ?? null
    : null;
  const slides = block.type === "HERO_CAROUSEL"
    ? draftBanner && draftBanner.placement === "HOME_HERO"
      ? draftBanner.id
        ? hero.map((item) => (item.id === draftBanner.id ? draftBanner : item))
        : [...hero, draftBanner]
      : hero
    : [];
  const title = block.type === "HERO_CAROUSEL" ? slides[0]?.[copy].title || "Hero banner" : block.type === "PROMOTIONAL_BANNER" ? banner?.[copy].title || "Promotion" : block.type === "HOME_SECTION" ? section?.[copy].title || "Section" : block.type === "CATEGORY_CAROUSEL" ? (locale === "ar" ? "اكتشف حلولنا" : "Explore Our Solutions") : locale === "ar" ? "آراء عملائنا" : "What Our Customers Say";
  return (
    <article className={`rounded-3xl bg-white p-4 ${block.isVisible ? "" : "opacity-60"}`}>
      <p className="text-xs font-semibold text-brand">{describeBlock(block, data, hero).type}{block.isVisible ? "" : " · Hidden"}</p>
      {block.type === "HERO_CAROUSEL" ? <StoredImage src={slides[0]?.desktopImageUrl ?? null} alt="" className="mt-3 aspect-[2/1] w-full rounded-2xl" /> : null}
      {block.type === "PROMOTIONAL_BANNER" ? (
        <div className="mt-3 grid items-center gap-4 md:grid-cols-2">
          <StoredImage src={banner?.desktopImageUrl ?? null} alt="" fit="contain" className="w-full" />
          <div>
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted">{banner?.[copy].subtitle}</p>
          </div>
        </div>
      ) : <h3 className="mt-2 text-2xl font-bold">{title}</h3>}
      {block.type === "CATEGORY_CAROUSEL" ? <p className="mt-2 text-sm text-muted">{data.categories.length} active categories in a carousel.</p> : null}
      {block.type === "TESTIMONIAL_CAROUSEL" ? <p className="mt-2 text-sm text-muted">{data.approvedReviewCount} approved reviews.</p> : null}
      {section ? <p className="mt-2 text-sm text-muted">{section[copy].subtitle}</p> : null}
    </article>
  );
}

function AddChoice({ label, detail, onClick }: { label: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="cursor-pointer rounded-2xl border border-line px-4 py-3 text-start hover:border-brand"><span className="block font-bold">{label}</span><span className="mt-1 block text-sm text-muted">{detail}</span></button>;
}

function LocaleButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold ${selected ? "bg-brand text-white" : "border border-line bg-white"}`}>{children}</button>;
}

function EditorDialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-pointer bg-brand-deep/45" aria-label="Close dialog" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="homepage-editor-title" className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-[var(--shadow-panel)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="homepage-editor-title" className="text-lg font-bold">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="cursor-pointer text-sm font-semibold">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BannerForm({ form, onChange, onSave, onCancel }: { form: Banner; onChange: (banner: Banner) => void; onSave: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const hero = form.placement === "HOME_HERO";
  return (
    <div>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <ImageField label="Desktop image" hint={hero ? "Export at 1920 × 960 px so the banner fills the width and stays shorter than the screen." : undefined} src={form.desktopImageUrl} onChange={(desktopImageUrl) => onChange({ ...form, desktopImageUrl })} onError={setError} />
        <ImageField label="Mobile image" hint={hero ? "Export at 1080 × 1350 px. Optional. Phones use this picture." : undefined} src={form.mobileImageUrl} onChange={(mobileImageUrl) => onChange({ ...form, mobileImageUrl })} onError={setError} optional />
        <Field label="English title" value={form.en.title} onChange={(title) => onChange({ ...form, en: { ...form.en, title } })} />
        <Field label="العنوان بالعربية" value={form.ar.title} dir="rtl" onChange={(title) => onChange({ ...form, ar: { ...form.ar, title } })} />
        <Field label="English subtitle" value={form.en.subtitle} onChange={(subtitle) => onChange({ ...form, en: { ...form.en, subtitle } })} />
        <Field label="العنوان الفرعي بالعربية" value={form.ar.subtitle} dir="rtl" onChange={(subtitle) => onChange({ ...form, ar: { ...form.ar, subtitle } })} />
        <Field label="English button label" value={form.en.buttonLabel ?? ""} onChange={(buttonLabel) => onChange({ ...form, en: { ...form.en, buttonLabel } })} />
        <Field label="نص الزر بالعربية" value={form.ar.buttonLabel ?? ""} dir="rtl" onChange={(buttonLabel) => onChange({ ...form, ar: { ...form.ar, buttonLabel } })} />
        <Field label="Destination URL" hint="Enter a website URL, an internal path, or a same-page anchor such as #service-categories." value={form.linkUrl ?? ""} onChange={(linkUrl) => onChange({ ...form, linkUrl })} />
        {hero ? null : <Field label="Sort order" value={String(form.sortOrder)} onChange={(value) => onChange({ ...form, sortOrder: Number(value) || 1 })} />}
        <Field label="Starts" value={form.startsAt ?? ""} type="datetime-local" onChange={(startsAt) => onChange({ ...form, startsAt })} />
        <Field label="Ends" value={form.endsAt ?? ""} type="datetime-local" onChange={(endsAt) => onChange({ ...form, endsAt })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 cursor-pointer" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} /> Active</label>
      </div>
      <div className="mt-4 flex gap-2"><Button type="button" onClick={onSave}>Save banner</Button><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </div>
  );
}

function SectionForm({ form, categories, services, onChange, onSave, onCancel }: { form: Section; categories: CategoryOption[]; services: ServiceOption[]; onChange: (section: Section) => void; onSave: () => void; onCancel: () => void }) {
  const needsCategory = form.type === "FEATURED_CATEGORIES" || form.type === "CATEGORY_SERVICES";
  const needsServices = form.type !== "FEATURED_CATEGORIES";
  const choices = services.filter((service) => form.type !== "CATEGORY_SERVICES" || service.categoryId === form.categoryId);
  const selected = form.serviceIds.flatMap((id) => { const service = services.find((item) => item.id === id); return service ? [service] : []; });
  return (
    <div>
      <p className="text-sm text-muted">A featured category section highlights one active category. Service sections use published services and one price each.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Section type<select className={`${fieldClass} mt-1`} value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as SectionType, categoryId: null, categoryTitle: null, serviceIds: [] })}>{Object.entries(sectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {needsCategory ? <label className="text-sm font-semibold">Category<select className={`${fieldClass} mt-1`} value={form.categoryId ?? ""} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value); onChange({ ...form, categoryId: event.target.value || null, categoryTitle: category?.title ?? null, serviceIds: [] }); }}><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label> : null}
        <Field label="English title" value={form.en.title} onChange={(title) => onChange({ ...form, en: { ...form.en, title } })} />
        <Field label="العنوان بالعربية" value={form.ar.title} dir="rtl" onChange={(title) => onChange({ ...form, ar: { ...form.ar, title } })} />
        <Field label="English subtitle" value={form.en.subtitle} onChange={(subtitle) => onChange({ ...form, en: { ...form.en, subtitle } })} />
        <Field label="العنوان الفرعي بالعربية" value={form.ar.subtitle} dir="rtl" onChange={(subtitle) => onChange({ ...form, ar: { ...form.ar, subtitle } })} />
        {needsServices ? <Field label="Maximum items" value={String(form.maxItems)} onChange={(value) => onChange({ ...form, maxItems: Number(value) || 1 })} /> : null}
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4 cursor-pointer" checked={form.isActive} onChange={(event) => onChange({ ...form, isActive: event.target.checked })} /> Active</label>
      </div>
      {needsServices ? (
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">Add a published service<select className={`${fieldClass} mt-1`} value="" onChange={(event) => { if (event.target.value && !form.serviceIds.includes(event.target.value)) onChange({ ...form, serviceIds: [...form.serviceIds, event.target.value] }); }}><option value="">Choose a service</option>{choices.filter((service) => !form.serviceIds.includes(service.id)).map((service) => <option key={service.id} value={service.id}>{service.name} · {service.price} {service.currency}</option>)}</select></label>
          {selected.map((service, index) => (
            <div key={service.id} className="flex items-center gap-3 rounded-2xl border border-line p-2">
              <StoredImage src={service.coverImageUrl} alt="" className="size-12 rounded-xl" />
              <div className="min-w-0 flex-1"><p className="font-semibold">{service.name}</p><p className="text-sm text-muted">{service.price} {service.currency}</p></div>
              <IconButton label="Move service up" disabled={index === 0} onClick={() => onChange({ ...form, serviceIds: moveItem(form.serviceIds, index, -1) })}><ArrowUp className="size-4" /></IconButton>
              <IconButton label="Move service down" disabled={index === selected.length - 1} onClick={() => onChange({ ...form, serviceIds: moveItem(form.serviceIds, index, 1) })}><ArrowDown className="size-4" /></IconButton>
              <IconButton label={`Remove ${service.name}`} onClick={() => onChange({ ...form, serviceIds: form.serviceIds.filter((id) => id !== service.id) })}><Trash2 className="size-4" /></IconButton>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex gap-2"><Button type="button" onClick={onSave}>Save section</Button><Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button></div>
    </div>
  );
}

function Field({ label, value, onChange, dir, type = "text", hint }: { label: string; value: string; onChange: (value: string) => void; dir?: "rtl"; type?: string; hint?: string }) {
  return <label className="text-sm font-semibold" dir={dir}>{label}<input className={`${fieldClass} mt-1`} type={type} value={value} dir={dir} onChange={(event) => onChange(event.target.value)} />{hint ? <span className="mt-1 block text-xs font-normal leading-5 text-muted">{hint}</span> : null}</label>;
}

function ImageField({ label, src, onChange, onError, optional, hint }: { label: string; src: string | null; onChange: (value: string | null) => void; onError: (message: string) => void; optional?: boolean; hint?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted">{hint}</p> : null}
      <StoredImage src={src} alt="" className="mt-2 aspect-[16/7] w-full rounded-2xl" />
      <div className="mt-2 flex gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-semibold">{src ? "Replace" : "Upload"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) readImage(file, onChange, onError); }} /></label>
        {optional && src ? <Button type="button" variant="secondary" onClick={() => onChange(null)}>Remove</Button> : null}
      </div>
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-canvas-muted disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}
