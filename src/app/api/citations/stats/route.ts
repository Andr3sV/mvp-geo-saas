import { NextRequest, NextResponse } from "next/server";
import { getCitationStats } from "@/lib/queries/citations";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const stats = await getCitationStats(projectId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching citation stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch citation stats" },
      { status: 500 }
    );
  }
}

