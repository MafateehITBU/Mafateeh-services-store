import { legalDocument, type LegalPageKey } from "@/content/legal-pages";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ locale: string }> };

export async function legalMetadata(params: PageProps["params"], page: LegalPageKey): Promise<Metadata> {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  return { title: legalDocument(page, locale).title };
}

export async function LegalPage({ params, page }: PageProps & { page: LegalPageKey }) {
  await connection();
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const store = await getTranslations("Store");
  const document = legalDocument(page, locale as AppLocale);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
      <nav aria-label={store("breadcrumbs")} className="flex items-center gap-2 text-sm text-[#5d6b62]">
        <Link href="/" className="cursor-pointer font-semibold hover:text-brand">{store("home")}</Link>
        <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
        <span className="text-ink">{document.title}</span>
      </nav>
      <header className="mt-6 border-b border-[#e4ebe6] pb-6">
        <h1 className="text-3xl font-bold md:text-4xl">{document.title}</h1>
        <p className="mt-3 text-sm text-[#5d6b62]">{document.updated}</p>
      </header>
      <div className="mt-8 space-y-8">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold text-[#157037]">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-base leading-7 text-ink">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
