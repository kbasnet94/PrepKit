import type { Guide, GuideTool } from "./types";

/**
 * A tool aggregated across all downloaded guides, with cross-references.
 */
export interface AggregatedTool extends GuideTool {
  /** Number of distinct guides that reference this tool */
  guideCount: number;
  /** Slugs of guides that reference this tool (for linking) */
  guideSlugs: string[];
  /** Titles of guides that reference this tool (for display) */
  guideTitles: string[];
}

/**
 * Deduplicate tools across all cached guides by tool `id`.
 * Returns an array sorted by category, then name.
 */
export function aggregateTools(guides: Guide[]): AggregatedTool[] {
  const toolMap = new Map<string, AggregatedTool>();

  for (const guide of guides) {
    for (const tool of guide.tools ?? []) {
      // Skip tools without a valid id
      if (!tool.id) continue;

      const existing = toolMap.get(tool.id);
      if (existing) {
        // Only count each guide once per tool
        if (!existing.guideSlugs.includes(guide.slug)) {
          existing.guideCount++;
          existing.guideSlugs.push(guide.slug);
          existing.guideTitles.push(guide.title);
        }
      } else {
        toolMap.set(tool.id, {
          ...tool,
          guideCount: 1,
          guideSlugs: [guide.slug],
          guideTitles: [guide.title],
        });
      }
    }
  }

  return Array.from(toolMap.values()).sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

/**
 * Group tools by category for SectionList rendering.
 */
export function groupToolsByCategory(
  tools: AggregatedTool[]
): { title: string; data: AggregatedTool[] }[] {
  const groups = new Map<string, AggregatedTool[]>();

  for (const tool of tools) {
    const cat = tool.category || "Other";
    const list = groups.get(cat) || [];
    list.push(tool);
    groups.set(cat, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
}
