import { Platform } from "react-native";
import { supabase } from "./supabase";
import { getDeviceId } from "./device-id";
import { getDatabase } from "./database";

// --- Record a view (called when guide detail screen opens) ---

export async function recordGuideView(guideSlug: string): Promise<void> {
  if (Platform.OS === "web") return; // SQLite not available on web

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO guide_views (guide_slug, view_count, last_viewed_at, needs_sync)
     VALUES (?, 1, ?, 1)
     ON CONFLICT(guide_slug) DO UPDATE SET
       view_count = view_count + 1,
       last_viewed_at = ?,
       needs_sync = 1`,
    [guideSlug, now, now]
  );
}

// --- Sync dirty view counts to Supabase ---

export async function syncGuideViews(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const db = await getDatabase();
    const deviceId = await getDeviceId();

    // Get rows that need syncing
    const rows = await db.getAllAsync<{
      guide_slug: string;
      view_count: number;
      last_viewed_at: string;
    }>("SELECT guide_slug, view_count, last_viewed_at FROM guide_views WHERE needs_sync = 1");

    if (rows.length === 0) return;

    // Upsert to Supabase
    const upsertData = rows.map((row) => ({
      device_id: deviceId,
      guide_slug: row.guide_slug,
      view_count: row.view_count,
      last_viewed_at: row.last_viewed_at,
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("guide_view_counts")
      .upsert(upsertData, { onConflict: "device_id,guide_slug" });

    if (error) {
      console.warn("[GuideViews] Sync failed:", error.message);
      return;
    }

    // Mark as synced locally
    const slugs = rows.map((r) => r.guide_slug);
    const placeholders = slugs.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE guide_views SET needs_sync = 0 WHERE guide_slug IN (${placeholders})`,
      slugs
    );
  } catch (e) {
    console.warn("[GuideViews] Sync error:", e);
  }
}
