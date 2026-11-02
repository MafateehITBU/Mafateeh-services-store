import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <Container className="py-20 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("body")}</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
      >
        {t("home")}
      </Link>
    </Container>
  );
}
