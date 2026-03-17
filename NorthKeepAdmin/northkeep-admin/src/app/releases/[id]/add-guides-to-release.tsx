"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ApprovedVersion = {
  id: string;
  guide_id: string;
  version_number: number;
  title: string;
  guides: { slug: string }[] | { slug: string };
  guide_categories: { slug: string; name: string }[] | { slug: string; name: string } | null;
};

function getCategoryInfo(v: ApprovedVersion): { slug: string; name: string } {
  if (!v.guide_categories) return { slug: "uncategorized", name: "Uncategorized" };
  const cat = Array.isArray(v.guide_categories) ? v.guide_categories[0] : v.guide_categories;
  return cat ?? { slug: "uncategorized", name: "Uncategorized" };
}

export function AddGuidesToRelease({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ApprovedVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    setCategoryFilter("all");
    fetch(`/api/guides/approved?releaseId=${releaseId}`)
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open, releaseId]);

  // Build category list from data
  const categories = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const v of list) {
      const cat = getCategoryInfo(v);
      const existing = map.get(cat.slug);
      if (existing) existing.count++;
      else map.set(cat.slug, { name: cat.name, count: 1 });
    }
    return Array.from(map.entries())
      .map(([slug, { name, count }]) => ({ slug, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [list]);

  // Filtered list based on category
  const filtered = useMemo(() => {
    if (categoryFilter === "all") return list;
    return list.filter((v) => getCategoryInfo(v).slug === categoryFilter);
  }, [list, categoryFilter]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((v) => selected.has(v.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const v of filtered) next.delete(v.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const v of filtered) next.add(v.id);
        return next;
      });
    }
  }

  async function addSelected() {
    if (selected.size === 0) return;
    setBulkAdding(true);
    try {
      // Deduplicate by guide_id — keep highest version_number per guide
      const byGuide = new Map<string, ApprovedVersion>();
      for (const v of list) {
        if (!selected.has(v.id)) continue;
        const existing = byGuide.get(v.guide_id);
        if (!existing || v.version_number > existing.version_number) {
          byGuide.set(v.guide_id, v);
        }
      }
      const items = Array.from(byGuide.values()).map((v) => ({
        guideId: v.guide_id,
        guideVersionId: v.id,
      }));

      const res = await fetch(`/api/releases/${releaseId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-bulk", items }),
      });

      if (res.ok) {
        const addedIds = new Set(items.map((i) => i.guideVersionId));
        setList((prev) => prev.filter((v) => !addedIds.has(v.id)));
        setSelected(new Set());
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to add guides: ${err.message ?? res.statusText}`);
      }
    } catch (e) {
      alert(`Error adding guides: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setBulkAdding(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add guides</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add approved guides</DialogTitle>
          <DialogDescription>
            Select guides to add to this release. {list.length} available.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        {!loading && list.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap border-b pb-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded border px-2 py-1.5 text-sm bg-background"
            >
              <option value="all">All categories ({list.length})</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>

            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allFilteredSelected ? "Deselect all" : `Select all (${filtered.length})`}
            </Button>

            <Button
              size="sm"
              disabled={selected.size === 0 || bulkAdding}
              onClick={addSelected}
              className="ml-auto"
            >
              {bulkAdding ? "Adding..." : `Add ${selected.size} selected`}
            </Button>
          </div>
        )}

        {/* Guide list */}
        <div className="overflow-auto flex-1 min-h-0">
          {loading ? (
            <p className="text-muted-foreground text-sm p-4">Loading...</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4">
              No approved versions to add, or all are already in this release.
            </p>
          ) : (
            <ul className="space-y-1 py-1">
              {filtered.map((v) => {
                const cat = getCategoryInfo(v);
                const isSelected = selected.has(v.id);
                return (
                  <li
                    key={v.id}
                    className={`flex items-center gap-3 rounded border p-2 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleOne(v.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-4 w-4 rounded accent-primary shrink-0 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm block truncate">{v.title}</span>
                      <span className="text-muted-foreground text-xs">{cat.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0">v{v.version_number}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
