import { getPublicCategoryTree } from "@/features/categories/get-public-categories";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale } from "next-intl";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale");

  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ error: "invalid_locale" }, { status: 400 });
  }

  const result = await getPublicCategoryTree(locale as AppLocale);
  const status = result.unavailable ? 503 : 200;

  return Response.json(
    {
      categories: result.categories,
      unavailable: result.unavailable,
    },
    {
      status,
      headers: status === 200 ? { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } : { "Cache-Control": "no-store" },
    },
  );
}
