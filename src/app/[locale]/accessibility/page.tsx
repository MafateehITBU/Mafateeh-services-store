import { LegalPage, legalMetadata } from "@/components/storefront/legal-page";

export const instant = false;

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps) {
  return legalMetadata(params, "accessibility");
}

export default function AccessibilityPage({ params }: PageProps) {
  return <LegalPage params={params} page="accessibility" />;
}
