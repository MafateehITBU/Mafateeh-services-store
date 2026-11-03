import type { PublicTestimonial } from "@/features/reviews/types";

const previews = {
  en: [
    {
      id: "preview-1",
      name: "Preview customer",
      location: "Example location",
      comment: "This example shows how a short approved review will appear, including the customer line and the stars.",
      rating: 5,
    },
    {
      id: "preview-2",
      name: "Preview customer",
      location: "Example location",
      comment: "This example uses a longer review so the card height, line spacing, and carousel slide can be checked before real reviews exist.",
      rating: 4,
    },
    {
      id: "preview-3",
      name: "Preview customer",
      location: "Example location",
      comment: "This example is another layout sample. It is not a quotation from a Mafateeh customer.",
      rating: 5,
    },
  ],
  ar: [
    {
      id: "preview-1",
      name: "عميل للمعاينة",
      location: "موقع تجريبي",
      comment: "هذا مثال يوضح كيف سيظهر تقييم قصير ومعتمد، مع سطر العميل والنجوم.",
      rating: 5,
    },
    {
      id: "preview-2",
      name: "عميل للمعاينة",
      location: "موقع تجريبي",
      comment: "هذا مثال أطول لفحص ارتفاع البطاقة وتباعد الأسطر وحركة العرض قبل توفر تقييمات حقيقية.",
      rating: 4,
    },
    {
      id: "preview-3",
      name: "عميل للمعاينة",
      location: "موقع تجريبي",
      comment: "هذا مثال آخر للشكل فقط. وهو ليس اقتباسًا من عميل لدى مفاتيح.",
      rating: 5,
    },
  ],
} as const;

export function previewTestimonials(locale: "en" | "ar"): PublicTestimonial[] {
  return previews[locale].map((item) => ({
    ...item,
    avatarUrl: null,
    serviceHref: null,
    preview: true,
  }));
}
