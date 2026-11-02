import "server-only";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Every dashboard-managed image belongs in one of these PostgreSQL text columns
 * as a data URL. Future service, homepage, and profile uploads must call
 * imageFromBytes or imageFromDataUrl before writing these fields.
 */
export const uploadedImageFields = {
  categoryImage: "Category.iconImageUrl",
  categoryBanner: "Category.bannerImageUrl",
  serviceCover: "Service.coverImageUrl",
  serviceGallery: "ServiceImage.imageUrl",
  homepageDesktop: "StoreBanner.desktopImageUrl",
  homepageMobile: "StoreBanner.mobileImageUrl",
  userAvatar: "User.avatarUrl",
} as const;

const mimeTypes = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;

type ImageKind = keyof typeof mimeTypes;

export type StoredImage = {
  dataUrl: string;
  mimeType: (typeof mimeTypes)[ImageKind];
  byteLength: number;
};

export class ImageStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageStorageError";
  }
}

const invalidImageMessage = "Choose a PNG, JPEG, or WebP image up to 5 MB.";

function detectKind(bytes: Buffer): ImageKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function imageFromBytes(bytes: Buffer): StoredImage {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new ImageStorageError(invalidImageMessage);
  }

  const kind = detectKind(bytes);

  if (!kind) {
    throw new ImageStorageError(invalidImageMessage);
  }

  return {
    dataUrl: `data:${mimeTypes[kind]};base64,${bytes.toString("base64")}`,
    mimeType: mimeTypes[kind],
    byteLength: bytes.length,
  };
}

export function imageFromDataUrl(value: string): StoredImage {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("blob:")) {
    throw new ImageStorageError("Upload the image file. External image addresses are not stored.");
  }

  const payload = trimmed.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/i)?.[1];

  if (!payload) {
    throw new ImageStorageError(invalidImageMessage);
  }

  return imageFromBytes(Buffer.from(payload, "base64"));
}

export function optionalImageFromDataUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return imageFromDataUrl(value).dataUrl;
}
