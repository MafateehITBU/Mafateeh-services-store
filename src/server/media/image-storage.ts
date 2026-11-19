import "server-only";

export {
  ImageStorageError,
  MAX_IMAGE_BYTES,
  decodeStoredImage,
  imageFromBytes,
  imageFromDataUrl,
  isStoredDataImage,
  optionalImageFromDataUrl,
  type ImageProfile,
  type StoredImage,
} from "@/server/media/process-image";

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
