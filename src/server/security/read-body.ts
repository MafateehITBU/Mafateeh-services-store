import "server-only";

export const JSON_AUTH_BYTES = 16 * 1024;
export const JSON_FORM_BYTES = 64 * 1024;
export const JSON_IMAGE_BYTES = 12 * 1024 * 1024;
export const CATALOG_BYTES = 60 * 1024 * 1024;

export class PayloadTooLargeError extends Error {
  constructor(message = "The request is too large.") {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

async function readLimited(request: Request, maxBytes: number) {
  const declared = request.headers.get("content-length");

  if (declared !== null) {
    const length = Number(declared);

    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }

    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

export async function readTextLimited(request: Request, maxBytes: number) {
  return readLimited(request, maxBytes);
}

export async function readJsonLimited(request: Request, maxBytes: number) {
  const text = await readLimited(request, maxBytes);

  if (text.trim() === "") {
    return null;
  }

  return JSON.parse(text) as unknown;
}

export function payloadTooLargeResponse() {
  return Response.json({ error: "payload_too_large", message: "The request is too large." }, { status: 413 });
}

export async function readJsonCapped(request: Request, maxBytes: number) {
  try {
    return { json: await readJsonLimited(request, maxBytes) };
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return payloadTooLargeResponse();
    }

    return { json: null };
  }
}
