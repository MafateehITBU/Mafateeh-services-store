const fragmentPattern = /^#[A-Za-z][A-Za-z0-9_-]*$/;
const unsafeProtocol = /^(?:javascript|data|vbscript|file|blob):/i;

export const bannerDestinationError =
  "Use an https or http URL, an internal path, or a same-page anchor such as #service-categories.";

export function isSafeBannerDestination(value: string) {
  if (!value || /\s/.test(value) || value.includes("\\") || value.includes("\u0000")) {
    return false;
  }

  if (unsafeProtocol.test(value)) {
    return false;
  }

  if (fragmentPattern.test(value)) {
    return true;
  }

  if (value.startsWith("//")) {
    return false;
  }

  if (value.startsWith("/")) {
    return !value.includes(":") && !/[\u0000-\u001F\u007F]/.test(value);
  }

  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function bannerDestinationHref(value: string | null | undefined) {
  if (!value || !isSafeBannerDestination(value)) {
    return null;
  }

  return value;
}
