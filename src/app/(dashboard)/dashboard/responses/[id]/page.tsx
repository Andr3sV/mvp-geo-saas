import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ResponseDetail } from "@/components/responses/response-detail";
import { getAIResponseDetail } from "@/lib/queries/ai-responses";

interface ResponseDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResponseDetailPage({ params }: ResponseDetailPageProps) {
  const { id } = await params;

  const response = await getAIResponseDetail(id);

  if (!response) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <PageHeader
        title="Response Details"
        description="Complete analysis of this AI-generated response including brand mentions and sources"
      />

      <ResponseDetail response={response} />
    </div>
  );
}
