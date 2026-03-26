import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await params;
  const supabase = createAdminClient();

  const { data: tool, error } = await supabase
    .from("tools")
    .select("*")
    .eq("id", toolId)
    .single();

  if (error || !tool) {
    return NextResponse.json(
      { error: error?.message ?? "Tool not found" },
      { status: 404 }
    );
  }

  // Get linked guides via join table → guide_versions → guides
  const { data: joinRows } = await supabase
    .from("guide_version_tools")
    .select(
      `
      optional,
      context,
      sort_order,
      guide_versions!inner(
        id,
        version_number,
        review_status,
        guides!inner(id, slug, title)
      )
    `
    )
    .eq("tool_id", toolId);

  // Deduplicate by guide slug (a tool may appear in multiple versions of the same guide)
  const guideMap = new Map<
    string,
    { slug: string; title: string; guideId: string; latestVersionNumber: number }
  >();
  for (const row of joinRows ?? []) {
    const gv = row.guide_versions as unknown as {
      version_number: number;
      review_status: string;
      guides: { id: string; slug: string; title: string };
    };
    if (!gv?.guides) continue;
    const existing = guideMap.get(gv.guides.slug);
    if (!existing || gv.version_number > existing.latestVersionNumber) {
      guideMap.set(gv.guides.slug, {
        slug: gv.guides.slug,
        title: gv.guides.title,
        guideId: gv.guides.id,
        latestVersionNumber: gv.version_number,
      });
    }
  }

  return NextResponse.json({
    tool,
    linkedGuides: Array.from(guideMap.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Only allow updating known fields
  const allowedFields = [
    "name",
    "category",
    "description",
    "icon",
    "use_cases",
    "amazon_search_keywords",
    "amazon_enabled",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // If name is changing, check uniqueness
  if (updates.name) {
    const { data: existing } = await supabase
      .from("tools")
      .select("id")
      .eq("name", updates.name as string)
      .neq("id", toolId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `A tool named "${updates.name}" already exists` },
        { status: 409 }
      );
    }
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("tools")
    .update(updates)
    .eq("id", toolId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tool: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await params;
  const supabase = createAdminClient();

  // Check how many guide versions use this tool
  const { count } = await supabase
    .from("guide_version_tools")
    .select("id", { count: "exact", head: true })
    .eq("tool_id", toolId);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `This tool is linked to ${count} guide version(s). Unlink it from all guides before deleting.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("tools").delete().eq("id", toolId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
