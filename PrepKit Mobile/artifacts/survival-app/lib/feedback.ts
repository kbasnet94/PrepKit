import { supabase } from "./supabase";

export type FeedbackRating = "thumbs_up" | "thumbs_down";

interface GuideFeedbackPayload {
  guideId: string;
  guideSlug: string;
  guideVersionId?: string;
  rating: FeedbackRating;
  tags: string[];
  comment?: string;
  deviceId?: string;
}

interface AppFeedbackPayload {
  starRating: number;
  comment?: string;
  deviceId?: string;
}

export async function submitGuideFeedback(
  payload: GuideFeedbackPayload
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("guide_feedback").insert({
    guide_id: payload.guideId,
    guide_slug: payload.guideSlug,
    guide_version_id: payload.guideVersionId ?? null,
    rating: payload.rating,
    tags: payload.tags,
    comment: payload.comment ?? null,
    device_id: payload.deviceId ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function submitAppFeedback(
  payload: AppFeedbackPayload
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("app_feedback").insert({
    star_rating: payload.starRating,
    comment: payload.comment ?? null,
    device_id: payload.deviceId ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
