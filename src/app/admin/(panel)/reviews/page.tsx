import { AdminPageHeader } from "@/components/dashboard/admin-page-header";
import { ReviewsManager } from "@/components/dashboard/reviews-manager";

export const metadata = { title: "Reviews" };
export const instant = false;

export default function AdminReviewsPage() {
  return (
    <>
      <AdminPageHeader
        title="Reviews"
        description="Moderate customer reviews. Only approved reviews are public and count toward service ratings."
      />
      <ReviewsManager />
    </>
  );
}
