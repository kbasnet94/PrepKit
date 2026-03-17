import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReviewStatusSelect } from "@/components/guides/review-status-select";
import { ReviewSearchInput } from "@/components/guides/review-search-input";
import { ApprovedGuidesTable, type ApprovedVersion } from "@/components/guides/approved-guides-table";
import { Suspense } from "react";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q } = await searchParams;
  const supabase = createAdminClient();

  const { data: versions } = await supabase
    .from("guide_versions")
    .select(
      `
      id,
      guide_id,
      version_number,
      title,
      review_status,
      content_status,
      source_quality,
      updated_at,
      guides!guide_id(slug, title)
    `
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  let list = versions ?? [];
  if (filter === "needs_source_review") {
    list = list.filter((v) => v.content_status === "needs_source_review");
  } else if (filter === "draft") {
    list = list.filter((v) => v.review_status === "draft");
  } else if (filter === "in_review") {
    list = list.filter((v) => v.review_status === "in_review");
  } else if (filter === "approved") {
    list = list.filter((v) => v.review_status === "approved");
  } else if (filter === "weak_sources") {
    list = list.filter((v) => v.source_quality === "weak" || !v.source_quality);
  } else if (filter === "published") {
    list = list.filter((v) => v.review_status === "published");
  }

  const query = q?.trim().toLowerCase() ?? "";
  if (query) {
    list = list.filter((v) => v.title.toLowerCase().includes(query));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground text-sm">Guides by review status and content health.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={query ? `/review?q=${encodeURIComponent(query)}` : "/review"}>
            <Badge variant={!filter ? "default" : "secondary"}>All</Badge>
          </Link>
          <Link href={query ? `/review?filter=draft&q=${encodeURIComponent(query)}` : "/review?filter=draft"}>
            <Badge variant={filter === "draft" ? "default" : "secondary"}>Draft</Badge>
          </Link>
          <Link href={query ? `/review?filter=in_review&q=${encodeURIComponent(query)}` : "/review?filter=in_review"}>
            <Badge variant={filter === "in_review" ? "default" : "secondary"}>In review</Badge>
          </Link>
          <Link href={query ? `/review?filter=approved&q=${encodeURIComponent(query)}` : "/review?filter=approved"}>
            <Badge variant={filter === "approved" ? "default" : "secondary"}>Approved</Badge>
          </Link>
          <Link href={query ? `/review?filter=needs_source_review&q=${encodeURIComponent(query)}` : "/review?filter=needs_source_review"}>
            <Badge variant={filter === "needs_source_review" ? "default" : "secondary"}>Needs source review</Badge>
          </Link>
          <Link href={query ? `/review?filter=weak_sources&q=${encodeURIComponent(query)}` : "/review?filter=weak_sources"}>
            <Badge variant={filter === "weak_sources" ? "default" : "secondary"}>Weak / missing sources</Badge>
          </Link>
          <Link href={query ? `/review?filter=published&q=${encodeURIComponent(query)}` : "/review?filter=published"}>
            <Badge variant={filter === "published" ? "default" : "secondary"}>Published</Badge>
          </Link>
        </div>
        <Suspense>
          <ReviewSearchInput />
        </Suspense>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guides</CardTitle>
          <p className="text-muted-foreground text-sm">
            {list.length} version(s){query ? ` matching "${q}"` : ""}
            {filter === "approved" && list.length > 0 && " · select guides below to publish"}
          </p>
        </CardHeader>
        <CardContent>
          {filter === "approved" ? (
            <ApprovedGuidesTable versions={list as ApprovedVersion[]} />
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No items match the filter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Review status</TableHead>
                  <TableHead>Content status</TableHead>
                  <TableHead>Source quality</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((v) => {
                  const g = Array.isArray(v.guides) ? v.guides[0] : v.guides;
                  const slug = g && typeof g === "object" && "slug" in g ? (g as { slug: string }).slug : "";
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        <Link href={`/guides/${slug}`} className="hover:underline">
                          {v.title}
                        </Link>
                      </TableCell>
                      <TableCell>v{v.version_number}</TableCell>
                      <TableCell>
                        <ReviewStatusSelect versionId={v.id} currentStatus={v.review_status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{v.content_status ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{v.source_quality ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(v.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/guides/${slug}?tab=editor`} className="text-primary text-sm hover:underline">
                          Edit
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
