import type { Guide } from "./types";

// ─── Parent topic → key lookup (used by buildTopicMap) ────────────────────────

const PARENT_TOPIC_KEY_MAP: Record<string, string> = {
  Earthquakes: "earthquake",
  Floods: "flood",
  Tornadoes: "tornadoes",
  "Wildfire: Evacuation and Smoke Safety": "wildfire",
  Landslides: "landslides",
  "Bleeding and Wound Care": "wounds_and_bleeding",
  "Heat and Fluids": "heat",
  "Cold Exposure": "cold",
  Burns: "burns",
  "Airway Emergencies": "airway",
  "Musculoskeletal Injuries": "musculoskeletal",
  "Allergic Reactions": "allergy",
  "72-Hour Emergency Supplies and Go-Bags": "kits_and_go_bags",
  "Family Emergency and Communication Planning": "family_emergency_plan",
  "Shelter-in-Place Kits and Procedures": "shelter_in_place",
  "Medical Needs, Medicines, and Document Backup": "medical_backup",
  "Pet Emergency Preparation": "pet_emergency",
  "Home Readiness Basics and Safety Checks": "home_readiness",
  "Emergency Shelter Basics": "emergency_shelter_basics",
  "Tarp and Improvised Shelter Construction": "tarp_and_improvised_shelter",
  "Staying Warm Without Power or Heat": "staying_warm_without_power",
  "Keeping Clothing and Bedding Dry": "keeping_clothing_dry",
  "Cold and Wet Overnight Survival": "cold_wet_overnight",
  "Fire Starting Basics (Outdoor)": "fire_starting_basics",
  "Fire Starting in Wet Conditions (Outdoor)": "fire_starting_wet_conditions",
  "Fire Safety and Fuel Management (Outdoor and Indoor)": "fire_safety_and_fuel",
  "Safe Indoor Heating During Emergencies": "safe_indoor_heating",
  "Shelter vs Fire vs Clothing: Choosing Priorities": "shelter_fire_clothing_priority",
  "If You Get Lost": "lost_on_land",
  "Land Rescue Signaling": "land_rescue_signaling",
  "Land Navigation": "land_navigation",
  "Rescue Communication Tools": "rescue_comms",
  "Maritime Rescue": "maritime_rescue",
  "Simple Rescue Signaling": "simple_rescue_signaling",
  "Safe Drinking Water in Emergencies": "safe_water",
  "Food Safety During Power Outages": "food_safety_outage",
  "Sanitation and Contamination Prevention": "sanitation",
  "Safe Water Collection (Before Purification)": "safe_water_collection",
  "Refrigerator, Freezer, and Food Safety During Outages": "fridge_freezer_food_safety",
  "Blackout Basics & First 30 Minutes": "blackout_basics",
  "Battery Conservation & Backup Power": "battery_backup_power",
  "Generator Safety": "generator_safety",
  "Carbon Monoxide (CO) Safety": "co_safety",
  "Gas Leaks and Utility Shutoff Basics": "gas_leaks_utility_shutoff",
  "Damaged Buildings After Storms or Earthquakes": "damaged_buildings",
  "Safe Flashlight and Lantern Use": "flashlight_lantern_use",
  "Extreme Heat: Prevention and Emergencies": "extreme_heat",
  "Air Quality, Smoke, Dust, and Ash": "air_quality_smoke",
  "Air Quality: Smoke, Dust, and Haze": "air_quality_smoke",
  "Outdoor Thunderstorm and Lightning Safety": "lightning_safety",
  "Lightning and Thunderstorm Exposure": "lightning_safety",
  "Sun Protection and UV Safety": "sun_uv_safety",
  "Sun Exposure and UV-Related Heat Stress": "sun_uv_safety",
  "Altitude Illness": "altitude_illness",
  "Altitude-Related Exposure Basics": "altitude_illness",
  "Red Flag Weather and Environmental Symptoms": "weather_red_flags",
  "When Weather Exposure Becomes a Medical Emergency": "weather_red_flags",
  "Cold Weather: Prevention and Field Care": "cold_weather_field_care",
  "Cold Exposure, Hypothermia, and Frostbite": "cold_exposure_hypothermia",
  "First 30 Minutes: Stay Oriented and Make a Simple Plan": "first_30_minutes_orientation",
  "Water Collection and Basic Treatment Without Equipment": "water_collection_basic",
  "Basic Camp and Bivouac Hygiene": "basic_hygiene_field",
  "Basic Hygiene and Field Sanitation": "basic_hygiene_field",
  "Cordage, Knots, and Safe Tool Use": "cordage_knots_tools",
  "Simple, High-Value Knots and Cordage Uses": "cordage_knots_tools",
  "Emergency Kit Basics (Pocket, Daypack, and Go-Bag)": "emergency_kit_basics",
  "Packing and Using a Small Emergency Kit": "emergency_kit_basics",
  "Shelter, Warmth, and Task Management": "shelter_warmth_task_mgmt",
  "Knowing When to Stop Tasks and Focus on Shelter, Warmth, and Signaling": "shelter_warmth_task_mgmt",
  "Signaling and Active Rescue": "signaling_active_rescue",
  "General Field Health and Stamina": "field_health_stamina",
  "Knife and Multi-Tool Safety for Shelter, Food, and Repairs": "knife_tool_safety",
};

function buildTopicMap(guides: Guide[]): Record<string, string[]> {
  const topicMap: Record<string, string[]> = {};
  for (const g of guides) {
    if (!g.parentTopic) continue;
    const key =
      PARENT_TOPIC_KEY_MAP[g.parentTopic] ??
      g.parentTopic
        .toLowerCase()
        .replace(/[\s/:()&+]+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    if (!topicMap[key]) topicMap[key] = [];
    const id = g.id || g.slug;
    if (!topicMap[key].includes(id)) topicMap[key].push(id);
  }
  return topicMap;
}

// ─── Mutable in-memory store ──────────────────────────────────────────────────

let GUIDES_STORE: Guide[] = [];
let TOPIC_MAP_STORE: Record<string, string[]> = {};

type StoreListener = (guides: Guide[]) => void;
const listeners: Set<StoreListener> = new Set();

export function subscribeToGuideStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setGuideStore(guides: Guide[]): void {
  GUIDES_STORE = guides;
  TOPIC_MAP_STORE = buildTopicMap(guides);
  listeners.forEach((l) => l(guides));
}

export function getGuidesStore(): Guide[] {
  return GUIDES_STORE;
}

export function getTopicMapStore(): Record<string, string[]> {
  return TOPIC_MAP_STORE;
}
