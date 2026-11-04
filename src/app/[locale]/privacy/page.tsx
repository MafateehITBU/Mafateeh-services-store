import { LegalPage, legalMetadata } from "@/components/storefront/legal-page";

export const instant = false;

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps) {
  return legalMetadata(params, "privacy");
}

export default function PrivacyPage({ params }: PageProps) {
  return <LegalPage params={params} page="privacy" />;
}
