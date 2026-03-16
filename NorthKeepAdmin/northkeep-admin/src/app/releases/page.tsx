import { createAdminClient } from "@/lib/supabase/admin";
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
import { CreateReleaseForm } from "./create-release-form";

export default async function ReleasesPage() {
  const supabase = createAdminClient();

  const { data: releases } = await supabase
    .from("guide_releases")
    .select("id, release_name, semantic_version, status, release_notes, published_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Releases</h1>
          <p className="text-muted-foreground text-sm">Publish guide bundles for the mobile app.</p>
        </div>
        <CreateReleaseForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Release history</CardTitle>
          <p className="text-muted-foreground text-sm">
            Each release is a downloadable bundle (manifest + JSON) for the app.
          </p>
        </CardHeader>
        <CardContent>
          {!releases?.length ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No releases yet. Create one and add approved guide versions, then generate the bundle and publish.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releases.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.semantic_version}</TableCell>
                    <TableCell>{r.release_name}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "published" ? "default" : "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.published_at ? new Date(r.published_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/releases/${r.id}`}>Manage</Link>
                      </Button>
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
