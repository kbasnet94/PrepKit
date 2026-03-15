import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReleaseActions } from "./release-actions";
import { RemoveItemButton } from "./remove-item-button";
import { AddGuidesToRelease } from "./add-guides-to-release";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: release, error: releaseError } = await supabase
    .from("guide_releases")
    .select("*")
    .eq("id", id)
    .single();

  if (releaseError || !release) notFound();

  const { data: items } = await supabase
    .from("guide_release_items")
    .select(
      `
      id,
      guide_id,
      guide_version_id,
      guides(slug, title),
      guide_versions(version_number, title)
    `
    )
    .eq("release_id", id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/releases" className="text-muted-foreground hover:text-foreground text-sm">
            ← Releases
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{release.release_name}</h1>
          <p className="font-mono text-sm">{release.semantic_version}</p>
          <Badge variant={release.status === "published" ? "default" : "secondary"} className="mt-2">
            {release.status}
          </Badge>
        </div>
        <ReleaseActions release={release} itemCount={items?.length ?? 0} />
      </div>

      {release.release_notes && (
        <Card>
          <CardHeader>
            <CardTitle>Release notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{release.release_notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Guides in this release</CardTitle>
          <p className="text-muted-foreground text-sm">{items?.length ?? 0} guide(s)</p>
        </CardHeader>
        <CardContent>
          {!items?.length ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">No guides added yet.</p>
              <AddGuidesToRelease releaseId={id} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: Record<string, unknown>) => {
                  const g = Array.isArray(item.guides) ? item.guides[0] : item.guides;
                  const v = Array.isArray(item.guide_versions) ? item.guide_versions[0] : item.guide_versions;
                  const slug = g && typeof g === "object" && "slug" in g ? (g as { slug: string }).slug : "";
                  const title = g && typeof g === "object" && "title" in g ? (g as { title: string }).title : "";
                  const verNum = v && typeof v === "object" && "version_number" in v ? (v as { version_number: number }).version_number : "";
                  return (
                    <TableRow key={String(item.id)}>
                      <TableCell>
                        <Link href={`/guides/${slug}`} className="hover:underline">
                          {String(title)}
                        </Link>
                      </TableCell>
                      <TableCell>v{String(verNum)}</TableCell>
                      <TableCell>
                        <RemoveItemButton releaseId={id} guideId={String(item.guide_id)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {items && items.length > 0 && (
            <div className="mt-4">
              <AddGuidesToRelease releaseId={id} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
