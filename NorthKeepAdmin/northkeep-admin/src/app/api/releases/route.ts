import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { release_name, semantic_version, release_notes } = body;

  if (!release_name && !semantic_version) {
    return NextResponse.json({ message: "release_name or semantic_version required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guide_releases")
    .insert({
      release_name: release_name || semantic_version,
      semantic_version: semantic_version || "v0.0.0",
      status: "draft",
      release_notes: release_notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
