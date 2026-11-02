const allowedHosts = new Set(["wa.me", "api.whatsapp.com", "whatsapp.com"]);

export function getWhatsAppUrl() {
  const value = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed =
      url.protocol === "https:" &&
      (allowedHosts.has(host) || host.endsWith(".whatsapp.com"));

    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}
