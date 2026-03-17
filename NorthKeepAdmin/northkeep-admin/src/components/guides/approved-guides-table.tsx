"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ApprovedVersion = {
  id: string;
  guide_id: string;
  version_number: number;
  title: string;
  content_status: string | null;
  source_quality: string | null;
  updated_at: string;
  guides: { slug: string }[] | { slug: string } | null;
};

function getSlug(v: ApprovedVersion): string {
  if (!v.guides) return "";
  const g = Array.isArray(v.guides) ? v.guides[0] : v.guides;
  return g && typeof g === "object" && "slug" in g ? (g as { slug: string }).slug : "";
}

export function ApprovedGuidesTable({ versions }: { versions: ApprovedVersion[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const allSelected = versions.length > 0 && versions.every((v) => selected.has(v.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSuccessCount(null);
    setError(null);
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(versions.map((v) => v.id)));
    }
    setSuccessCount(null);
    setError(null);
  }

  async function handlePublish() {
    if (selected.size === 0 || isPublishing) return;
    setIsPublishing(true);
    setError(null);
    setSuccessCount(null);

    try {
      const res = await fetch("/api/releases/bulk-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionIds: [...selected] }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message ?? `Server error ${res.status}`);
      } else {
        setSuccessCount(data.guidesPublished ?? selected.size);
        setSelected(new Set());
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 min-h-[36px]">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded accent-primary"
            />
            {selected.size > 0 ? `${selected.size} selected` : "Select all"}
          </label>
        </div>

        <div className="flex items-center gap-3">
          {successCount !== null && (
            <span className="text-sm text-green-600">
              ✓ Published {successCount} guide{successCount !== 1 ? "s" : ""}
            </span>
          )}
          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
          <Button
            size="sm"
            disabled={selected.size === 0 || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? "Publishing…" : `Publish${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        </div>
      </div>

      {/* Table */}
      {versions.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">No items match the filter.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Guide</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Content status</TableHead>
              <TableHead>Source quality</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => {
              const slug = getSlug(v);
              const isSelected = selected.has(v.id);
              return (
                <TableRow
                  key={v.id}
                  className={isSelected ? "bg-primary/5" : "cursor-pointer"}
                  onClick={() => toggleOne(v.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(v.id)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/guides/${slug}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {v.title}
                    </Link>
                  </TableCell>
                  <TableCell>v{v.version_number}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{v.content_status ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{v.source_quality ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(v.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
