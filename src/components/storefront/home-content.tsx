import { ServiceCard, type ServiceCardData } from "@/components/storefront/service-card";
import { StoredImage } from "@/components/ui/stored-image";
import { Link } from "@/i18n/navigation";

type Section = {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  category: { slug: string; title: string; imageUrl: string | null } | null;
  services: ServiceCardData[];
};

export async function HomeSections({ sections }: { sections: Section[] }) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[var(--container)] space-y-12 px-4 py-8 md:px-6">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`}>
          <h2 id={`section-${section.id}`} className="text-2xl font-bold md:text-3xl">{section.title}</h2>
          {section.subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{section.subtitle}</p> : null}
          {section.type === "FEATURED_CATEGORIES" && section.category ? (
            <Link href={`/categories/${section.category.slug}`} className="mt-6 flex max-w-sm cursor-pointer items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
              {section.category.imageUrl ? <StoredImage src={section.category.imageUrl} alt="" className="size-16 rounded-xl" /> : null}
              <span className="font-bold">{section.category.title}</span>
            </Link>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {section.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
