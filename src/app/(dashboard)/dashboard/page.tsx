import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Redirect to citations page by default
  redirect("/dashboard/citations");
}

