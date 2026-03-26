import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ToolEditForm } from "./tool-edit-form";

export const dynamic = "force-dynamic";

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const supabase = createAdminClient();

  // ── Fetch tool ────────────────────────────────────────────────────────────
  const { data: tool, error } = await supabase
    .from("tools")
    .select("*")
    .eq("id", toolId)
    .single();

  if (error || !tool) return notFound();

  // ── Fetch linked guides ───────────────────────────────────────────────────
  const { data: joinRows } = await supabase
    .from("guide_version_tools")
    .select(
      `
      optional,
      context,
      guide_versions!inner(
        id,
        version_number,
        review_status,
        guides!inner(id, slug, title)
      )
    `
    )
    .eq("tool_id", toolId);

  // Deduplicate by guide slug (pick highest version)
  const guideMap = new Map<
    string,
    { slug: string; title: string; optional: boolean; context: string | null }
  >();
  for (const row of joinRows ?? []) {
    const gv = row.guide_versions as unknown as {
      version_number: number;
      guides: { slug: string; title: string };
    };
    if (!gv?.guides) continue;
    const existing = guideMap.get(gv.guides.slug);
    if (!existing) {
      guideMap.set(gv.guides.slug, {
        slug: gv.guides.slug,
        title: gv.guides.title,
        optional: row.optional,
        context: row.context,
      });
    }
  }

  const linkedGuides = Array.from(guideMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <ToolEditForm
      tool={tool}
      linkedGuides={linkedGuides}
    />
  );
}
