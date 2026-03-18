import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { validateConstraintTags } from "@/lib/constants/constraint-tags";
import { isValidResponseRole } from "@/lib/constants/response-roles";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ guideId: string; versionId: string }> }
) {
  const { guideId, versionId } = await params;
  const body = await _request.json();

  // Validate constraint metadata
  if (body.response_role != null && body.response_role !== "" && !isValidResponseRole(body.response_role)) {
    return NextResponse.json(
      { message: `Invalid response_role. Allowed: primary, backup, supporting, reference` },
      { status: 400 }
    );
  }
  const ct = Array.isArray(body.constraint_tags) ? body.constraint_tags : [];
  const bc = Array.isArray(body.blocked_by_constraints) ? body.blocked_by_constraints : [];
  const ctResult = validateConstraintTags(ct.map(String));
  const bcResult = validateConstraintTags(bc.map(String));
  if (ctResult.invalid.length > 0 || bcResult.invalid.length > 0) {
    const invalid = [...new Set([...ctResult.invalid, ...bcResult.invalid])];
    return NextResponse.json(
      { message: `Invalid constraint tags: ${invalid.join(", ")}. Use approved tags from the registry.` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const allowed = [
    "title", "summary", "quick_answer", "preferred_action", "backup_action",
    "when_to_use", "step_by_step_actions", "warnings", "what_not_to_do",
    "red_flags", "preparedness_tips", "source_references", "app_tags", "notes",
    "response_role", "constraint_tags", "blocked_by_constraints", "alternative_to_guide_slugs", "content_gaps",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if ("constraint_tags" in body) update.constraint_tags = ctResult.valid;
  if ("blocked_by_constraints" in body) update.blocked_by_constraints = bcResult.valid;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("guide_versions")
    .update(update)
    .eq("id", versionId)
    .eq("guide_id", guideId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: error.code === "PGRST116" ? 404 : 400 });
  }
  return NextResponse.json(data);
}
