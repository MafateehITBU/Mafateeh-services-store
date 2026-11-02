import { redirect } from "next/navigation";

export const instant = false;

export default function AdminBannersPage() {
  redirect("/admin/homepage");
}
