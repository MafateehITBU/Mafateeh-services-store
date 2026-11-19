"use client";

import { StoredImage } from "@/components/ui/stored-image";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart } from "@/features/cart/cart-provider";
import { Link } from "@/i18n/navigation";
import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type CartService = {
  id: string;
  slug: string;
  name: string;
  coverImageUrl: string | null;
  currency: string;
  price: number;
  compareAtPrice: number | null;
};

function formatMoney(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

export function CartView({ locale }: { locale: "en" | "ar" }) {
  const t = useTranslations("Cart");
  const { items, ready, removeItem, setQuantity } = useCart();
  const [services, setServices] = useState<CartService[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [failed, setFailed] = useState(false);
  const ids = items.map((item) => item.id).join(",");

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!ids) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/cart/services?locale=${locale}&ids=${encodeURIComponent(ids)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("cart_services_failed");
        }

        return (await response.json()) as { services: CartService[] };
      })
      .then((payload) => {
        setFailed(false);
        setServices(payload.services);
        setLoadedKey(ids);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setFailed(true);
        setServices([]);
        setLoadedKey(ids);
      });

    return () => controller.abort();
  }, [ids, locale, ready]);

  if (!ready || (ids && loadedKey !== ids)) {
    return <p className="mt-10 text-sm text-muted">{t("loading")}</p>;
  }

  if (failed) {
    return <p className="mt-10 text-sm text-muted">{t("error")}</p>;
  }

  const details = new Map(services.map((service) => [service.id, service]));
  const lines = items.flatMap((item) => {
    const service = details.get(item.id);

    if (!service) {
      return [];
    }

    return [{ ...service, quantity: item.quantity, lineTotal: service.price * item.quantity }];
  });

  if (lines.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#157037] px-5 text-sm font-semibold text-white hover:bg-[#116332]">
              {t("continueShopping")}
            </Link>
          }
        />
      </div>
    );
  }

  const currencies = [...new Set(lines.map((line) => line.currency))];

  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ul>
        {lines.map((line) => (
          <li key={line.id} className="flex flex-col gap-4 border-b border-[#ececec] py-5 sm:flex-row sm:items-center">
            <Link href={`/services/${line.slug}`} className="shrink-0">
              <StoredImage src={line.coverImageUrl} alt={line.name} className="size-20 rounded-xl" width={80} height={80} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/services/${line.slug}`} className="font-semibold text-ink hover:text-brand">
                {line.name}
              </Link>
              <p className="mt-1">
                <span className="font-bold text-[#d3122a]">
                  {formatMoney(line.price, locale)} {line.currency}
                </span>
                {line.compareAtPrice !== null ? (
                  <span className="ms-2 text-sm text-[#9aa3b2] line-through">
                    {formatMoney(line.compareAtPrice, locale)} {line.currency}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#d9dde3]">
              <button type="button" aria-label={t("decrease")} onClick={() => setQuantity(line.id, line.quantity - 1)} disabled={line.quantity <= 1} className="inline-flex size-10 cursor-pointer items-center justify-center text-ink disabled:cursor-not-allowed disabled:opacity-40">
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <span className="min-w-8 text-center text-sm font-semibold">{line.quantity}</span>
              <button type="button" aria-label={t("increase")} onClick={() => setQuantity(line.id, line.quantity + 1)} disabled={line.quantity >= 99} className="inline-flex size-10 cursor-pointer items-center justify-center text-ink disabled:cursor-not-allowed disabled:opacity-40">
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>
            <p className="min-w-28 text-sm font-semibold text-ink">
              {t("lineTotal")}: {formatMoney(line.lineTotal, locale)} {line.currency}
            </p>
            <button type="button" aria-label={t("remove")} onClick={() => removeItem(line.id)} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#fdecec] text-[#e23b3b]">
              <X aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <aside className="rounded-2xl border border-[#e7ebf0] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] lg:sticky lg:top-28">
        <h2 className="text-lg font-bold">{t("summary")}</h2>
        {currencies.map((currency) => {
          const group = lines.filter((line) => line.currency === currency);
          const total = group.reduce((sum, line) => sum + line.lineTotal, 0);
          const count = group.reduce((sum, line) => sum + line.quantity, 0);
          const amount = `${formatMoney(total, locale)} ${currency}`;

          return (
            <div key={currency} className="mt-6 space-y-4">
              <p className="flex items-center justify-between gap-4 text-sm">
                <span>{t("productsTotal")}</span>
                <span className="font-semibold">{amount}</span>
              </p>
              <p className="flex items-center justify-between gap-4 font-bold">
                <span>{t("orderTotal", { count })}</span>
                <span>{amount}</span>
              </p>
            </div>
          );
        })}
        <button type="button" className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">
          {t("completeOrder")}
        </button>
      </aside>
    </div>
  );
}
