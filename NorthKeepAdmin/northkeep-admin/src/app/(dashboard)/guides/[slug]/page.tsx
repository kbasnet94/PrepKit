import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuidePreview } from "@/components/guides/guide-preview";
import { GuideEditorForm } from "@/components/guides/guide-editor-form";
import { ReviewStatusSelect } from "@/components/guides/review-status-select";
import { GuideImagesManager } from "@/components/guides/guide-images-manager";
import type { GuideImage } from "@/types/database";

export default async function GuideDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const supabase = createAdminClient();

  const { data: guide, error: guideError } = await supabase
    .from("guides")
    .select(
      `
      id,
      slug,
      title,
      legacy_id,
      category_id,
      parent_topic_id,
      current_published_version_id,
      is_active,
      guide_categories(slug, name),
      guide_parent_topics(slug, name)
    `
    )
    .eq("slug", slug)
    .single();

  if (guideError || !guide) notFound();

  const { data: versions } = await supabase
    .from("guide_versions")
    .select("id, version_number, title, review_status, change_summary, updated_at")
    .eq("guide_id", guide.id)
    .order("version_number", { ascending: false });

  const publishedVersion = versions?.find((v) => v.id === guide.current_published_version_id);

  const { data: latestVersionFull } = await supabase
    .from("guide_versions")
    .select("*")
    .eq("guide_id", guide.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  const latestVersion = latestVersionFull ?? null;

  const stepCount =
    (latestVersion as { step_by_step_actions?: string[] } | null)
      ?.step_by_step_actions?.length ?? 0;

  const cat = Array.isArray(guide.guide_categories) ? guide.guide_categories[0] : guide.guide_categories;
  const topic = Array.isArray(guide.guide_parent_topics) ? guide.guide_parent_topics[0] : guide.guide_parent_topics;
  const categoryName = cat && typeof cat === "object" && "name" in cat ? String(cat.name) : "—";
  const topicName = topic && typeof topic === "object" && "name" in topic ? String(topic.name) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/guides" className="text-muted-foreground hover:text-foreground text-sm">
            ← Guide Library
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{guide.title}</h1>
          <p className="text-muted-foreground font-mono text-sm">{guide.slug}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{categoryName}</Badge>
            <Badge variant="outline">{topicName}</Badge>
            {(latestVersion as { response_role?: string | null })?.response_role && (
              <Badge variant="outline">Role: {(latestVersion as { response_role: string }).response_role}</Badge>
            )}
            {publishedVersion && (
              <Badge>Published v{publishedVersion.version_number}</Badge>
            )}
            {latestVersion && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">Status:</span>
                <ReviewStatusSelect
                  versionId={latestVersion.id}
                  currentStatus={latestVersion.review_status}
                />
              </div>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/guides/${slug}?tab=editor`}>Edit latest version</Link>
        </Button>
      </div>

      <Tabs defaultValue={tab === "editor" ? "editor" : tab === "versions" ? "versions" : tab === "images" ? "images" : "preview"}>
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="versions">Version history</TabsTrigger>
          <TabsTrigger value="editor">Edit</TabsTrigger>
          <TabsTrigger value="images">
            Images
            {latestVersion && Array.isArray((latestVersion as { images?: GuideImage[] }).images) && (latestVersion as { images?: GuideImage[] }).images!.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 font-medium text-white text-xs">
                {(latestVersion as { images?: GuideImage[] }).images!.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="mt-4">
          {latestVersion ? (
            <GuidePreview version={latestVersion} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No version content yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
              <p className="text-muted-foreground text-sm">All versions of this guide.</p>
            </CardHeader>
            <CardContent>
              {!versions?.length ? (
                <p className="text-muted-foreground text-sm">No versions.</p>
              ) : (
                <ul className="space-y-2">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-start justify-between rounded-md border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">v{v.version_number}</span>
                          <ReviewStatusSelect
                            versionId={v.id}
                            currentStatus={v.review_status}
                          />
                          {v.id === guide.current_published_version_id && (
                            <Badge>Currently published</Badge>
                          )}
                        </div>
                        {v.change_summary && (
                          <p className="text-muted-foreground text-xs">{v.change_summary}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0 text-sm">
                        {new Date(v.updated_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="editor" className="mt-4">
          {latestVersion ? (
            <GuideEditorForm guideId={guide.id} version={latestVersion} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Create a version first from the Edit page.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="images" className="mt-4">
          {latestVersion ? (
            <GuideImagesManager
              versionId={latestVersion.id}
              guideSlug={guide.slug}
              initialImages={
                Array.isArray((latestVersion as { images?: GuideImage[] }).images)
                  ? (latestVersion as { images?: GuideImage[] }).images!
                  : []
              }
              reviewStatus={latestVersion.review_status}
              stepCount={stepCount}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">No version content yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
