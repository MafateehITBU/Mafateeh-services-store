import { listCartServices } from "@/features/cart/get-cart-services";
import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale } from "next-intl";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean);

  if (!locale || !hasLocale(routing.locales, locale)) {
    return Response.json({ error: "invalid_locale" }, { status: 400 });
  }

  try {
    const services = await listCartServices(locale as AppLocale, ids);
    return Response.json({ services });
  } catch (error) {
    console.error("cart_services_failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ error: "cart_services_failed" }, { status: 500 });
  }
}
