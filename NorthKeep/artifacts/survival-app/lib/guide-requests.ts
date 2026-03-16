import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { getDeviceId } from "./device-id";

const UPVOTED_KEY = "northkeep_upvoted_requests";

export interface GuideRequest {
  id: string;
  topic: string;
  description: string | null;
  upvote_count: number;
  status: "pending" | "planned" | "completed";
  created_at: string;
}

export async function fetchRequests(search?: string, limit = 50): Promise<GuideRequest[]> {
  let query = supabase
    .from("guide_requests")
    .select("id, topic, description, upvote_count, status, created_at")
    .order("upvote_count", { ascending: false })
    .limit(limit);

  if (search?.trim()) {
    query = query.ilike("topic", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function submitRequest(
  topic: string,
  description?: string
): Promise<GuideRequest> {
  const deviceId = await getDeviceId();

  const { data, error } = await supabase
    .from("guide_requests")
    .insert({
      topic: topic.trim(),
      description: description?.trim() || null,
      device_id: deviceId,
    })
    .select("id, topic, description, upvote_count, status, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function upvoteRequest(requestId: string): Promise<void> {
  const deviceId = await getDeviceId();

  // ON CONFLICT DO NOTHING via unique constraint (request_id, device_id)
  await supabase
    .from("request_upvotes")
    .insert({ request_id: requestId, device_id: deviceId });

  await saveUpvotedId(requestId);
}

export async function getUpvotedIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(UPVOTED_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

async function saveUpvotedId(id: string): Promise<void> {
  const current = await getUpvotedIds();
  current.add(id);
  await AsyncStorage.setItem(UPVOTED_KEY, JSON.stringify([...current]));
}
