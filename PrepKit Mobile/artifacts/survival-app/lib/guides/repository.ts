import { getGuidesStore, getTopicMapStore } from "./guide-store";
import type {
  Guide,
  GuideCategory,
  GuideLayer,
  GuideSourceQuality,
  GuideContentStatus,
  GuideSourceReference,
  SourceFamily,
} from "./types";

export function getAllGuides(): Guide[] {
  return getGuidesStore();
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return getGuidesStore().find((g) => g.slug === slug);
}

export function getGuidesByCategory(category: GuideCategory): Guide[] {
  return getGuidesStore().filter((g) => g.category === category);
}

export function getGuidesByLayer(layer: GuideLayer): Guide[] {
  return getGuidesStore().filter((g) => g.layer === layer);
}

export function getGuidesBySourceQuality(quality: GuideSourceQuality): Guide[] {
  return getGuidesStore().filter((g) => g.sourceQuality === quality);
}

export function getGuidesByContentStatus(status: GuideContentStatus): Guide[] {
  return getGuidesStore().filter((g) => g.contentStatus === status);
}

export function getGuidesByTopic(topic: string): Guide[] {
  const GUIDES = getGuidesStore();
  const ids = getTopicMapStore()[topic] ?? [];
  return ids
    .map((id) => GUIDES.find((g) => g.id === id || g.slug === id))
    .filter((g): g is Guide => g !== undefined);
}

export function getRelatedGuides(guide: Guide): Guide[] {
  const GUIDES = getGuidesStore();
  const TOPIC_MAP = getTopicMapStore();
  const related: Guide[] = [];

  if (guide.parentTopic) {
    const parent = GUIDES.find((g) => g.id === guide.parentTopic || g.slug === guide.parentTopic);
    if (parent && parent.id !== guide.id) related.push(parent);
  }

  const siblingsAndChildren = GUIDES.filter(
    (g) =>
      g.id !== guide.id &&
      guide.parentTopic &&
      (g.parentTopic === guide.parentTopic || g.id === guide.parentTopic || g.slug === guide.parentTopic)
  );
  for (const s of siblingsAndChildren) {
    if (!related.find((r) => r.id === s.id)) related.push(s);
  }

  const topicEntries = Object.entries(TOPIC_MAP);
  for (const [, ids] of topicEntries) {
    if (ids.includes(guide.id) || ids.includes(guide.slug)) {
      for (const id of ids) {
        if (id !== guide.id && id !== guide.slug) {
          const g = GUIDES.find((g) => g.id === id || g.slug === id);
          if (g && !related.find((r) => r.id === g.id)) related.push(g);
        }
      }
      break;
    }
  }

  return related.slice(0, 4);
}

export function getTopicMap(): Record<string, string[]> {
  return getTopicMapStore();
}

export function searchGuides(query: string): Guide[] {
  const GUIDES = getGuidesStore();
  const q = query.trim().toLowerCase();
  if (!q) return GUIDES;
  return GUIDES.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.tags.some((t) => t.includes(q))
  );
}

const CATEGORY_ORDER: GuideCategory[] = [
  "natural_disasters",
  "medical_safety",
  "water_food",
  "preparedness",
  "communication",
  "navigation",
  "power_utilities_home_safety",
  "shelter_fire_warmth",
  "weather_environment",
  "core_skills",
];

export function getAllCategories(): GuideCategory[] {
  const GUIDES = getGuidesStore();
  const seen = new Set<string>();
  const result: GuideCategory[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (GUIDES.some((g) => g.category === cat) && !seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }
  for (const g of GUIDES) {
    if (!seen.has(g.category)) {
      seen.add(g.category);
      result.push(g.category);
    }
  }
  return result;
}

export function getAllReferences(): GuideSourceReference[] {
  return [];
}

export function getReferenceById(_id: string): GuideSourceReference | undefined {
  return undefined;
}

export function getReferencesForGuide(_guide: Guide): GuideSourceReference[] {
  return [];
}

export function getAllSourceFamilies(): SourceFamily[] {
  return [];
}

export function getGuideCountByCategory(): Record<string, number> {
  return getGuidesStore().reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = (acc[g.category] ?? 0) + 1;
    return acc;
  }, {});
}
