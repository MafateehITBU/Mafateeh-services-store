import type { AppLocale } from "@/i18n/routing";

const localized = {
  en: {
    address: "Wahib Al Afyouni St., Amman, Jordan",
    hours: "9:00 AM – 5:00 PM",
  },
  ar: {
    address: "شارع وهيب الأفيوني، عمّان، الأردن",
    hours: "9:00 صباحاً – 5:00 مساءً",
  },
} as const;

export const site = {
  name: "Mafateeh",
  legalName: "Mafateeh Group",
  phone: "+962 77 060 9728",
  phoneHref: "tel:+962770609728",
  email: "info@mafateehgroup.com",
  emailHref: "mailto:info@mafateehgroup.com",
  copyrightYear: 2026,
  social: [] as Array<{ href: string; label: string }>,
  locale(locale: AppLocale) {
    return localized[locale];
  },
};
