"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { ResponsesTable } from "@/components/responses/responses-table";

export default function AIResponsesPage() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <PageHeader
        title="AI Responses"
        description="Explore all AI-generated responses and their analysis. Click on any response to view full details, brand mentions, and cited sources."
      />

      <ResponsesTable />
    </div>
  );
}
