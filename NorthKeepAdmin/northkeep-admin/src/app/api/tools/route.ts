import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category") ?? "";
  const amazonFilter = searchParams.get("amazon") ?? ""; // "enabled" | "disabled" | ""

  const supabase = createAdminClient();

  // Fetch all tools
  let query = supabase
    .from("tools")
    .select("*", { count: "exact" })
    .order("category")
    .order("name");

  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (amazonFilter === "enabled") {
    query = query.eq("amazon_enabled", true);
  } else if (amazonFilter === "disabled") {
    query = query.eq("amazon_enabled", false);
  }

  const { data: tools, error, count } = await query.limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get guide counts per tool via join table
  const toolIds = (tools ?? []).map((t) => t.id);
  let guideCounts: Record<string, number> = {};

  if (toolIds.length > 0) {
    const { data: joinRows } = await supabase
      .from("guide_version_tools")
      .select("tool_id");

    if (joinRows) {
      const countMap: Record<string, Set<string>> = {};
      for (const row of joinRows) {
        if (!countMap[row.tool_id]) countMap[row.tool_id] = new Set();
        countMap[row.tool_id].add(row.tool_id);
      }
      // Count distinct join rows per tool (each guide_version link)
      for (const row of joinRows) {
        guideCounts[row.tool_id] = (guideCounts[row.tool_id] ?? 0) + 1;
      }
      // Deduplicate: count unique guide_version_ids per tool
      guideCounts = {};
      const perTool: Record<string, Set<string>> = {};
      for (const row of joinRows as { tool_id: string; guide_version_id?: string }[]) {
        if (!perTool[row.tool_id]) perTool[row.tool_id] = new Set();
        perTool[row.tool_id].add(row.guide_version_id ?? "");
      }
      for (const [tid, set] of Object.entries(perTool)) {
        guideCounts[tid] = set.size;
      }
    }
  }

  // Get distinct categories for filter dropdown
  const categories = [...new Set((tools ?? []).map((t) => t.category))].sort();

  return NextResponse.json({
    tools: (tools ?? []).map((t) => ({
      ...t,
      guideCount: guideCounts[t.id] ?? 0,
    })),
    count: count ?? 0,
    categories,
  });
}
