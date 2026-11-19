const encoder = new TextEncoder();

export const SESSION_ISSUER = "mafateeh-store";

export async function derivedSecret(secret: string, info: "admin-session" | "customer-session" | "otp") {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("mafateeh-store"),
      info: encoder.encode(info),
    },
    key,
    256,
  );

  return new Uint8Array(bits);
}
