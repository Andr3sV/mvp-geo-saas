import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Redirect to Executive Overview page by default
  redirect("/dashboard/reports/executive");
}

