export type PublicCategory = {
  id: string;
  slug: string;
  title: string;
  iconName: string | null;
  children: PublicCategory[];
};

export type PublicCategoryResult = {
  categories: PublicCategory[];
  unavailable: boolean;
};
