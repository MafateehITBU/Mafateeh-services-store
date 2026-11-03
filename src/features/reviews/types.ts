export type PublicTestimonial = {
  id: string;
  name: string;
  location: string | null;
  avatarUrl: string | null;
  rating: number;
  comment: string;
  serviceHref: string | null;
  preview: boolean;
};
