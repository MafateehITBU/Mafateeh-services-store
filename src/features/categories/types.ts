export type PublicCategory = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  iconName: string | null;
  children: PublicCategory[];
};

export type PublicCategoryResult = {
  categories: PublicCategory[];
  unavailable: boolean;
};

export type PublicCategoryDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};
