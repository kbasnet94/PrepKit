import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FolderTree, Layers, Package, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const [
    guidesRes,
    categoriesRes,
    topicsRes,
    versionsRes,
    releasesRes,
    needsReviewRes,
    unreleasedApprovedRes,
    recentRes,
  ] = await Promise.all([
    supabase.from("guides").select("id", { count: "exact", head: true }),
    supabase.from("guide_categories").select("id", { count: "exact", head: true }),
    supabase.from("guide_parent_topics").select("id", { count: "exact", head: true }),
    supabase.from("guide_versions").select("id", { count: "exact", head: true }),
    supabase.from("guide_releases").select("id", { count: "exact", head: true }),
    supabase.from("guide_versions").select("id", { count: "exact", head: true }).eq("content_status", "needs_source_review"),
    supabase.from("guide_versions").select("id", { count: "exact", head: true }).eq("review_status", "approved"),
    supabase.from("guide_versions").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);

  const totalGuides = guidesRes.count ?? 0;
  const totalCategories = categoriesRes.count ?? 0;
  const totalTopics = topicsRes.count ?? 0;
  const totalVersions = versionsRes.count ?? 0;
  const totalReleases = releasesRes.count ?? 0;
  const needsSourceReview = needsReviewRes.count ?? 0;
  const approvedUnreleased = unreleasedApprovedRes.count ?? 0;
  const recent = recentRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your guide library and review state.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guides</CardTitle>
            <BookOpen className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalGuides}</p>
            <p className="text-muted-foreground text-xs">Stable guide identities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderTree className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCategories}</p>
            <p className="text-muted-foreground text-xs">Guide categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Topics</CardTitle>
            <Layers className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTopics}</p>
            <p className="text-muted-foreground text-xs">Topic groupings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Releases</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalReleases}</p>
            <p className="text-muted-foreground text-xs">Published bundles</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs source review</CardTitle>
            <AlertTriangle className="text-amber-600 h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{needsSourceReview}</p>
            <p className="text-muted-foreground text-xs">Guides with content_status = needs_source_review</p>
            {needsSourceReview > 0 && (
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/review?filter=needs_source_review">View in Review Queue</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved, unreleased</CardTitle>
            <CheckCircle className="text-green-600 h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{approvedUnreleased}</p>
            <p className="text-muted-foreground text-xs">Ready to add to a release</p>
            {approvedUnreleased > 0 && (
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/releases">Manage Releases</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently updated</CardTitle>
          <p className="text-muted-foreground text-sm">Latest guide version edits</p>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No guide versions yet. Run the import script to seed data.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((v) => (
                <li key={v.id} className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{v.title}</span>
                  <span className="text-muted-foreground shrink-0">
                    {v.updated_at ? new Date(v.updated_at).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
