import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ToolsFilters } from "./tools-filters";

export const dynamic = "force-dynamic";

// Category badge colors — earthy, survival-themed palette
const CATEGORY_COLORS: Record<string, string> = {
  equipment:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  technique:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  supply:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  material:
    "bg-stone-100 text-stone-700 dark:bg-stone-800/50 dark:text-stone-300",
};

function getCategoryBadgeClass(category: string): string {
  return (
    CATEGORY_COLORS[category.toLowerCase()] ??
    "bg-muted text-muted-foreground"
  );
}

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    amazon?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  // ── Fetch tools ─────────────────────────────────────────────────────────────
  let query = supabase
    .from("tools")
    .select("*", { count: "exact" })
    .order("category")
    .order("name");

  if (params.q?.trim()) {
    query = query.or(
      `name.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%`
    );
  }
  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.amazon === "enabled") {
    query = query.eq("amazon_enabled", true);
  } else if (params.amazon === "disabled") {
    query = query.eq("amazon_enabled", false);
  }

  const { data: tools, error, count } = await query.limit(200);

  // ── Guide counts per tool ───────────────────────────────────────────────────
  let guideCounts: Record<string, number> = {};
  if (!error && tools && tools.length > 0) {
    const { data: joinRows } = await supabase
      .from("guide_version_tools")
      .select("tool_id, guide_version_id");

    if (joinRows) {
      const perTool: Record<string, Set<string>> = {};
      for (const row of joinRows) {
        if (!perTool[row.tool_id]) perTool[row.tool_id] = new Set();
        perTool[row.tool_id].add(row.guide_version_id);
      }
      for (const [tid, set] of Object.entries(perTool)) {
        guideCounts[tid] = set.size;
      }
    }
  }

  // ── Distinct categories for filter ──────────────────────────────────────────
  const { data: allTools } = await supabase
    .from("tools")
    .select("category");
  const categories = [
    ...new Set((allTools ?? []).map((t) => t.category)),
  ].sort();

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error loading tools: {error.message}. Ensure Supabase is
              configured and the tools migration is applied.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalTools = count ?? 0;
  const amazonEnabled = (tools ?? []).filter(
    (t) => t.amazon_enabled
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
          <p className="text-muted-foreground text-sm">
            Manage canonical tool definitions, Amazon affiliate links, and
            display metadata.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{totalTools}</strong> tool
            {totalTools !== 1 && "s"}
          </span>
          <span className="text-muted-foreground">
            <strong className="text-foreground">{amazonEnabled}</strong>{" "}
            Amazon-linked
          </span>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <ToolsFilters categories={categories} />

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Library</CardTitle>
          <CardDescription>
            {totalTools} tool{totalTools !== 1 && "s"} across{" "}
            {categories.length} categor
            {categories.length !== 1 ? "ies" : "y"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tools?.length ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No tools found. Tools are created automatically when guides are
              imported through the pipeline.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="max-w-[280px]">
                    Description
                  </TableHead>
                  <TableHead>Amazon</TableHead>
                  <TableHead className="text-right">Guides</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => {
                  const gc = guideCounts[tool.id] ?? 0;
                  return (
                    <TableRow key={tool.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/tools/${tool.id}`}
                          className="hover:underline"
                        >
                          {tool.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getCategoryBadgeClass(
                            tool.category
                          )}`}
                        >
                          {tool.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[280px] text-sm">
                        <span className="line-clamp-2">
                          {tool.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        {tool.amazon_enabled ? (
                          <Badge variant="default" className="text-xs">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Off
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {gc}
                      </TableCell>
                      <TableCell>
                        <Link href={`/tools/${tool.id}`}>
                          <span className="text-primary text-sm hover:underline">
                            Edit
                          </span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
