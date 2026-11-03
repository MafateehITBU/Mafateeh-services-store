import { BrandLogo } from "@/components/layout/brand-logo";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export async function SiteFooter({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Footer");
  const details = site.locale(locale);
  const logoAlt = await getTranslations("Header");

  return (
    <footer className="mt-16 bg-brand-deep text-white">
      <Container className="grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <BrandLogo alt={logoAlt("logoAlt")} variant="white" className="h-10 md:h-12" />
          <p className="mt-4 max-w-xs text-sm leading-7 text-white/80">{t("description")}</p>
        </div>
        <FooterColumn title={t("store")}>
          <Link href="/" className="cursor-pointer hover:text-brand-gold">
            {t("home")}
          </Link>
        </FooterColumn>
        <FooterColumn title={t("company")}>
          <ExternalLink href={details.about}>{t("about")}</ExternalLink>
          <ExternalLink href={details.services}>{t("services")}</ExternalLink>
          <ExternalLink href={details.contact}>{t("contact")}</ExternalLink>
        </FooterColumn>
        <FooterColumn title={t("contactInfo")}>
          <ContactLine label={t("address")} value={details.address} />
          <ContactLine label={t("phone")} value={site.phone} href={site.phoneHref} />
          <ContactLine label={t("email")} value={site.email} href={site.emailHref} />
          <ContactLine label={t("hours")} value={details.hours} />
          {site.social.length > 0 ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {site.social.map((item) => (
                <ExternalLink key={item.href} href={item.href}>
                  {item.label}
                </ExternalLink>
              ))}
            </div>
          ) : null}
        </FooterColumn>
      </Container>
      <div className="border-t border-white/15">
        <Container className="flex flex-col gap-4 py-5 text-sm text-white/75 md:flex-row md:items-center md:justify-between">
          <p>{t("rights", { year: site.copyrightYear })}</p>
          {site.privacyHref || site.termsHref ? (
            <div className="flex flex-wrap gap-4">
              {site.privacyHref ? <ExternalLink href={site.privacyHref}>{t("privacy")}</ExternalLink> : null}
              {site.termsHref ? <ExternalLink href={site.termsHref}>{t("terms")}</ExternalLink> : null}
            </div>
          ) : null}
        </Container>
        <Container className="pb-8">
          <div className="rounded-2xl border border-dashed border-white/25 px-4 py-4">
            <p className="text-sm font-semibold text-white">{t("payments")}</p>
            <p className="mt-1 text-sm text-white/70">{t("paymentsReserved")}</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">{children}</div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cursor-pointer hover:text-brand-gold">
      {children}
    </a>
  );
}

function ContactLine({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <p>
      <span className="block text-xs text-white/55">{label}</span>
      {href ? (
        <a href={href} className="cursor-pointer hover:text-brand-gold">
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </p>
  );
}
