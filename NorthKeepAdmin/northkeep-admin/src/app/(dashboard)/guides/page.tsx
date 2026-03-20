import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    action_card: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    scenario_guide: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    preparedness_guide: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    reference_guide: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  };
  return map[type] ?? "bg-muted text-muted-foreground";
}

function formatGuideType(type: string): string {
  if (!type || type === "—") return "—";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRelease(releaseItems: unknown): string {
  const items = Array.isArray(releaseItems) ? releaseItems : [];
  if (items.length === 0) return "—";

  const releases = items
    .map((ri: Record<string, unknown>) => {
      const rel = ri.guide_releases;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter(Boolean) as { semantic_version: string; status: string }[];

  const published = releases.filter((r) => r.status === "published");
  if (published.length > 0) {
    return published.sort((a, b) =>
      b.semantic_version.localeCompare(a.semantic_version)
    )[0].semantic_version;
  }

  const draft = releases.filter((r) => r.status === "draft");
  if (draft.length > 0) return `${draft[0].semantic_version} (draft)`;

  return "—";
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload } from "lucide-react";
import { GuideLibraryFilters } from "./guide-library-filters";

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; type?: string; responseRole?: string }>;
}) {
  const params = await searchParams;
  const supabase = createAdminClient();

  const categoriesRes = await supabase.from("guide_categories").select("id, slug, name").eq("is_active", true).order("sort_order");
  const categories = (categoriesRes.data ?? []).map((c) => ({ slug: c.slug, name: c.name }));
  const categoryIdBySlug = new Map((categoriesRes.data ?? []).map((c) => [c.slug, c.id]));

  let query = supabase
    .from("guides")
    .select(
      `
      id,
      slug,
      title,
      is_active,
      current_published_version_id,
      guide_categories(slug, name),
      guide_parent_topics(slug, name),
      guide_versions!guide_id(
        version_number, review_status, content_status, guide_type, layer, response_role,
        guide_release_items!guide_release_items_guide_version_id_fkey(
          guide_releases(semantic_version, status)
        )
      )
    `,
      { count: "exact" }
    )
    .order("updated_at", { ascending: false });

  if (params.q?.trim()) {
    query = query.or(`title.ilike.%${params.q.trim()}%,slug.ilike.%${params.q.trim()}%`);
  }
  if (params.category) {
    const cid = categoryIdBySlug.get(params.category);
    if (cid) query = query.eq("category_id", cid);
  }

  const { data: rawGuides, error, count } = await query.limit(100);

  let guides = rawGuides ?? [];
  if (!error && (params.status || params.type || params.responseRole)) {
    guides = guides.filter((g: Record<string, unknown>) => {
      const v = (g.guide_versions as Record<string, unknown>[]) ?? [];
      const latest = [...v].sort((a, b) => Number(b.version_number) - Number(a.version_number))[0];
      if (params.status && latest?.review_status !== params.status) return false;
      if (params.type && latest?.guide_type !== params.type) return false;
      if (params.responseRole && latest?.response_role !== params.responseRole) return false;
      return true;
    });
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Guide Library</h1>
          <Button asChild size="sm">
            <Link href="/guides/import" className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import JSON
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading guides: {error.message}. Ensure Supabase is configured and migrations are applied.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guide Library</h1>
          <p className="text-muted-foreground text-sm">Browse and edit survival guides.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/guides/import" className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import JSON
          </Link>
        </Button>
      </div>

      <GuideLibraryFilters categories={categories} />

      <Card>
        <CardHeader>
          <CardTitle>Guides</CardTitle>
          <p className="text-muted-foreground text-sm">
            {count ?? 0} guide{count === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent>
          {!guides?.length ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No guides found. Run the import script to seed data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((g: Record<string, unknown>) => {
                  const cat = Array.isArray(g.guide_categories) ? g.guide_categories[0] : g.guide_categories;
                  const topic = Array.isArray(g.guide_parent_topics) ? g.guide_parent_topics[0] : g.guide_parent_topics;
                  const versions = (g.guide_versions as Record<string, unknown>[]) ?? [];
                  const latest = [...versions].sort(
                    (a, b) => Number((b as { version_number?: number }).version_number) - Number((a as { version_number?: number }).version_number)
                  )[0];
                  const categoryName = cat && typeof cat === "object" && "name" in cat ? String(cat.name) : "—";
                  const topicName = topic && typeof topic === "object" && "name" in topic ? String(topic.name) : "—";
                  const reviewStatus = latest && typeof latest === "object" && "review_status" in latest ? String(latest.review_status) : "—";
                  const guideType = latest && typeof latest === "object" && "guide_type" in latest ? String(latest.guide_type) : "—";
                  const typeBadgeClass = getTypeBadgeClass(guideType);
                  return (
                    <TableRow key={String(g.id)}>
                      <TableCell className="max-w-[200px] font-medium">
                        <Link href={`/guides/${g.slug}`} className="block break-words hover:underline line-clamp-2" title={String(g.title)}>
                          {String(g.title)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] font-mono text-xs">
                        <span className="block break-all line-clamp-2" title={String(g.slug)}>
                          {String(g.slug)}
                        </span>
                      </TableCell>
                      <TableCell>{categoryName}</TableCell>
                      <TableCell>{topicName}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeBadgeClass}`}>
                          {formatGuideType(guideType)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={reviewStatus === "published" ? "default" : "secondary"}>{reviewStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {getRelease((latest as Record<string, unknown>)?.guide_release_items)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/guides/${g.slug}`}>
                          <span className="text-primary text-sm hover:underline">Edit</span>
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
