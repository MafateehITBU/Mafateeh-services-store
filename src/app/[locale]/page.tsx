import { Container } from "@/components/ui/container";
import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
        "x-default": "/en",
      },
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <Container className="py-16 md:py-24">
      <section className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-brand">{t("eyebrow")}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{t("message")}</p>
      </section>
      <section id="service-categories" aria-labelledby="service-categories-title" className="mx-auto mt-16 max-w-2xl scroll-mt-24 text-center">
        <h2 id="service-categories-title" className="text-2xl font-bold">{t("categoriesTitle")}</h2>
      </section>
    </Container>
  );
}
