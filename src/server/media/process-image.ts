import sharp from "sharp";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageKind = "png" | "jpeg" | "webp";

export type ImageProfile = "banner" | "cover" | "avatar";

export type StoredImage = {
  dataUrl: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  byteLength: number;
};

export class ImageStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageStorageError";
  }
}

const invalidImageMessage = "Choose a PNG, JPEG, or WebP image up to 5 MB.";

const maxWidth: Record<ImageProfile, number> = {
  banner: 2560,
  cover: 1600,
  avatar: 512,
};

function detectKind(bytes: Buffer): ImageKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }

  return null;
}

export function decodeStoredImage(value: string | null | undefined) {
  const match = value?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    bytes: Buffer.from(match[2], "base64"),
  };
}

export async function imageFromBytes(bytes: Buffer, profile: ImageProfile = "cover"): Promise<StoredImage> {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !detectKind(bytes)) {
    throw new ImageStorageError(invalidImageMessage);
  }

  try {
    const source = sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
    const meta = await source.metadata();

    if (!meta.width || !meta.height) {
      throw new ImageStorageError(invalidImageMessage);
    }

    const transparent = meta.hasAlpha === true;
    const width = maxWidth[profile];
    const pipeline = source.resize({
      width,
      height: profile === "avatar" ? width : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
    const output = transparent ? await pipeline.png({ compressionLevel: 9 }).toBuffer() : await pipeline.webp({ quality: 80 }).toBuffer();

    if (output.length === 0 || output.length > MAX_IMAGE_BYTES) {
      throw new ImageStorageError(invalidImageMessage);
    }

    const mimeType = transparent ? "image/png" : "image/webp";

    return {
      dataUrl: `data:${mimeType};base64,${output.toString("base64")}`,
      mimeType,
      byteLength: output.length,
    };
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw error;
    }

    throw new ImageStorageError(invalidImageMessage);
  }
}

export async function imageFromDataUrl(value: string, profile: ImageProfile = "cover"): Promise<StoredImage> {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("blob:")) {
    throw new ImageStorageError("Upload the image file. External image addresses are not stored.");
  }

  const decoded = decodeStoredImage(trimmed);

  if (!decoded || !detectKind(decoded.bytes)) {
    throw new ImageStorageError(invalidImageMessage);
  }

  return imageFromBytes(decoded.bytes, profile);
}

export async function optionalImageFromDataUrl(value: string | null | undefined, profile: ImageProfile = "cover") {
  if (!value) {
    return null;
  }

  return (await imageFromDataUrl(value, profile)).dataUrl;
}

export function isStoredDataImage(value: string | null | undefined) {
  return Boolean(decodeStoredImage(value));
}
