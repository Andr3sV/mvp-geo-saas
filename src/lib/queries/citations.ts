import { createClient } from "@/lib/supabase/server";

export async function getCitationStats(projectId: string) {
  const supabase = await createClient();

  // Total citations
  const { count: totalCitations } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  // Citations by platform
  const { data: citationsByPlatform } = await supabase
    .from("citations_detail")
    .select("ai_responses!inner(platform)")
    .eq("project_id", projectId);

  // Group by platform
  const platformCounts: Record<string, number> = {};
  citationsByPlatform?.forEach((item: any) => {
    const platform = item.ai_responses?.platform;
    if (platform) {
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }
  });

  const platformData = Object.entries(platformCounts).map(([name, count]) => ({
    name,
    citations: count,
    percentage: totalCitations ? (count / totalCitations) * 100 : 0,
  }));

  // Recent citations (last 20)
  const { data: recentCitations } = await supabase
    .from("citations_detail")
    .select(`
      id,
      citation_text,
      sentiment,
      confidence_score,
      created_at,
      ai_responses!inner(
        platform,
        prompt_text
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Citations this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count: thisWeekCount } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", oneWeekAgo.toISOString());

  // Citations last week
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { count: lastWeekCount } = await supabase
    .from("citations_detail")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", twoWeeksAgo.toISOString())
    .lt("created_at", oneWeekAgo.toISOString());

  // Calculate trend
  const trend = lastWeekCount
    ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
    : 0;

  return {
    totalCitations: totalCitations || 0,
    thisWeek: thisWeekCount || 0,
    lastWeek: lastWeekCount || 0,
    trend: Math.round(trend * 10) / 10,
    avgPerDay: thisWeekCount ? Math.round(thisWeekCount / 7) : 0,
    platformData: platformData.sort((a, b) => b.citations - a.citations),
    recentCitations: recentCitations || [],
  };
}

