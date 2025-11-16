"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { CompetitorsManager } from "@/components/competitors/competitors-manager";

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Management"
        description="Track and compare your brand against competitors across regions"
      />
      <CompetitorsManager />
    </div>
  );
}

