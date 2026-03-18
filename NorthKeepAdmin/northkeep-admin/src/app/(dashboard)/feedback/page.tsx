import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GuideFeedback, AppFeedback } from "@/types/database";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string; q?: string }>;
}) {
  const { rating: ratingFilter, q } = await searchParams;
  const supabase = createAdminClient();

  const [{ data: guideFeedback }, { data: appFeedback }] = await Promise.all([
    supabase
      .from("guide_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("app_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const allGuide: GuideFeedback[] = guideFeedback ?? [];
  const allApp: AppFeedback[] = appFeedback ?? [];

  // Apply filters to guide feedback
  let filteredGuide = allGuide;
  if (ratingFilter === "thumbs_up") {
    filteredGuide = filteredGuide.filter((f) => f.rating === "thumbs_up");
  } else if (ratingFilter === "thumbs_down") {
    filteredGuide = filteredGuide.filter((f) => f.rating === "thumbs_down");
  }
  const query = q?.trim().toLowerCase() ?? "";
  if (query) {
    filteredGuide = filteredGuide.filter((f) => f.guide_slug.toLowerCase().includes(query));
  }

  // Stats
  const thumbsUp = allGuide.filter((f) => f.rating === "thumbs_up").length;
  const thumbsDown = allGuide.filter((f) => f.rating === "thumbs_down").length;
  const thumbsUpPct = allGuide.length > 0 ? Math.round((thumbsUp / allGuide.length) * 100) : 0;

  const avgStars =
    allApp.length > 0
      ? (allApp.reduce((sum, f) => sum + f.star_rating, 0) / allApp.length).toFixed(1)
      : "—";

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function buildGuideHref(extra: Record<string, string>) {
    const params = new URLSearchParams();
    if (extra.rating) params.set("rating", extra.rating);
    if (extra.q ?? query) params.set("q", extra.q ?? query);
    const s = params.toString();
    return `/feedback${s ? `?${s}` : ""}`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground text-sm">User feedback from guide detail screens and the app.</p>
      </div>

      {/* ── Guide Feedback ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Guide Feedback</h2>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{allGuide.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">👍 Helpful</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{thumbsUp}</p>
              <p className="text-xs text-muted-foreground">{thumbsUpPct}% of responses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">👎 Not helpful</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{thumbsDown}</p>
              <p className="text-xs text-muted-foreground">{100 - thumbsUpPct}% of responses</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Link href={buildGuideHref({ rating: "" })}>
              <Badge variant={!ratingFilter ? "default" : "secondary"}>All</Badge>
            </Link>
            <Link href={buildGuideHref({ rating: "thumbs_up" })}>
              <Badge variant={ratingFilter === "thumbs_up" ? "default" : "secondary"}>👍 Helpful</Badge>
            </Link>
            <Link href={buildGuideHref({ rating: "thumbs_down" })}>
              <Badge variant={ratingFilter === "thumbs_down" ? "default" : "secondary"}>👎 Not helpful</Badge>
            </Link>
          </div>

          <form className="ml-auto" method="get" action="/feedback">
            {ratingFilter && <input type="hidden" name="rating" value={ratingFilter} />}
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by guide slug…"
              className="h-8 rounded-md border border-input bg-background px-3 text-sm w-56"
            />
          </form>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guide</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuide.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No feedback yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuide.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link
                        href={`/guides/${f.guide_slug}`}
                        className="font-mono text-sm text-blue-600 hover:underline"
                      >
                        {f.guide_slug}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg">{f.rating === "thumbs_up" ? "👍" : "👎"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.tags.length > 0
                          ? f.tags.map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs">
                                {t.replace(/_/g, " ")}
                              </Badge>
                            ))
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {f.comment ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(f.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* ── App Feedback ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">App Feedback</h2>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{allApp.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">⭐ Avg rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{avgStars}</p>
              <p className="text-xs text-muted-foreground">out of 5</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stars</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allApp.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No app feedback yet.
                  </TableCell>
                </TableRow>
              ) : (
                allApp.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <span className="text-base">{"⭐".repeat(f.star_rating)}</span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-sm text-muted-foreground line-clamp-2">
                        {f.comment ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(f.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
