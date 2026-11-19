import { searchPublicServices } from "@/features/services/get-public-services";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale } from "next-intl";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");
  const query = url.searchParams.get("q") ?? "";

  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ error: "invalid_locale" }, { status: 400 });
  }

  try {
    const results = await searchPublicServices(locale as AppLocale, query);
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error("search_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "search_failed" }, { status: 500 });
  }
}
