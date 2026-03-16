import { createAdminClient } from "@/lib/supabase/admin";
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
import { RequestStatusSelect } from "@/components/requests/request-status-select";
import Link from "next/link";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: statusFilter, q } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("guide_requests")
    .select("*")
    .order("upvote_count", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (q?.trim()) {
    query = query.ilike("topic", `%${q.trim()}%`);
  }

  const { data: requests } = await query.limit(200);

  // Counts for metrics strip
  const { count: total } = await supabase
    .from("guide_requests")
    .select("*", { count: "exact", head: true });

  const { count: pendingCount } = await supabase
    .from("guide_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: plannedCount } = await supabase
    .from("guide_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "planned");

  const list = requests ?? [];
  const searchQuery = q?.trim() ?? "";

  function filterHref(s: string) {
    const base = s === "all" ? "/requests" : `/requests?status=${s}`;
    return searchQuery ? `${base}${s === "all" ? "?" : "&"}q=${encodeURIComponent(searchQuery)}` : base;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Guide Requests</h1>
        <p className="text-muted-foreground text-sm">
          Topics requested by users, ranked by upvotes.
        </p>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-2xl font-bold">{total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-muted-foreground text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-2xl font-bold text-muted-foreground">{pendingCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-muted-foreground text-sm font-medium">Planned</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{plannedCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={filterHref("all")}>
            <Badge variant={!statusFilter || statusFilter === "all" ? "default" : "secondary"}>All</Badge>
          </Link>
          <Link href={filterHref("pending")}>
            <Badge variant={statusFilter === "pending" ? "default" : "secondary"}>Pending</Badge>
          </Link>
          <Link href={filterHref("planned")}>
            <Badge variant={statusFilter === "planned" ? "default" : "secondary"}>Planned</Badge>
          </Link>
          <Link href={filterHref("completed")}>
            <Badge variant={statusFilter === "completed" ? "default" : "secondary"}>Completed</Badge>
          </Link>
        </div>
        <form method="GET" action="/requests" className="flex items-center gap-2">
          {statusFilter && statusFilter !== "all" && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <input
            name="q"
            defaultValue={searchQuery}
            placeholder="Search topics…"
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-8 rounded-md border px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          />
        </form>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <p className="text-muted-foreground text-sm">
            {list.length} request{list.length !== 1 ? "s" : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </p>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No requests found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20 text-center">Upvotes</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-28">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.topic}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate text-sm">
                      {r.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {r.upvote_count}
                    </TableCell>
                    <TableCell>
                      <RequestStatusSelect
                        requestId={r.id}
                        currentStatus={r.status}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
