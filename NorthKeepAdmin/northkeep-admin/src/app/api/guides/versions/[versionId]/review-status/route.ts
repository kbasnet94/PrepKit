import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = ["draft", "in_review", "approved", "archived"] as const;
type ReviewStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params;

  let body: { review_status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { review_status } = body;

  if (!review_status || !(VALID_STATUSES as readonly string[]).includes(review_status)) {
    return NextResponse.json(
      { error: `Invalid review_status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("guide_versions")
    .update({ review_status: review_status as ReviewStatus })
    .eq("id", versionId)
    .select("id, review_status, updated_at")
    .single();

  if (error) {
    console.error("[review-status] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
