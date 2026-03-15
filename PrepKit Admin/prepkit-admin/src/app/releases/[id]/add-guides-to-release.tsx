"use client";

import { useState, useEffect } from "react";
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
};

export function AddGuidesToRelease({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ApprovedVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/guides/approved?releaseId=${releaseId}`)
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function add(guideId: string, guideVersionId: string) {
    setAdding(guideVersionId);
    try {
      const res = await fetch(`/api/releases/${releaseId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", guideId, guideVersionId }),
      });
      if (res.ok) {
        router.refresh();
        setList((prev) => prev.filter((v) => v.id !== guideVersionId));
      }
    } finally {
      setAdding(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add guides</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add approved guides</DialogTitle>
          <DialogDescription>
            Approved guide versions not yet in this release.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto flex-1 min-h-0">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground text-sm">No approved versions to add, or all are already in this release.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((v) => {
                const g = Array.isArray(v.guides) ? v.guides[0] : v.guides;
                const slug = g?.slug ?? "";
                return (
                  <li key={v.id} className="flex items-center justify-between rounded border p-2">
                    <span className="font-medium">{v.title}</span>
                    <span className="text-muted-foreground text-sm">v{v.version_number}</span>
                    <Button
                      size="sm"
                      disabled={adding === v.id}
                      onClick={() => add(v.guide_id, v.id)}
                    >
                      {adding === v.id ? "Adding…" : "Add"}
                    </Button>
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
