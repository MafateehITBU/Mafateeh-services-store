export function isDisplayableImage(src: string | null | undefined) {
  return Boolean(src && (src.startsWith("data:image/") || src.startsWith("/media/")));
}

export function localizedAlt(alt: string | null | undefined, name: string, locale: "en" | "ar") {
  const text = alt?.trim() ?? "";

  if (!text) {
    return name;
  }

  const arabic = /[\u0600-\u06FF]/.test(text);
  const latin = /[A-Za-z]/.test(text);

  if (locale === "ar" && !arabic) {
    return name;
  }

  if (locale === "en" && arabic && !latin) {
    return name;
  }

  return text;
}
