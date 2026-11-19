export function isDisplayableImage(src: string | null | undefined) {
  return Boolean(src && (src.startsWith("data:image/") || src.startsWith("/media/")));
}
