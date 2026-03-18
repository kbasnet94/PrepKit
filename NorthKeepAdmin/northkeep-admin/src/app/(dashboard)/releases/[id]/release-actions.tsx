"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Release = {
  id: string;
  status: string;
  semantic_version: string;
};

export function ReleaseActions({ release, itemCount }: { release: Release; itemCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function generateBundle() {
    setLoading("bundle");
    try {
      const res = await fetch(`/api/releases/${release.id}/generate`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `northkeep-bundle-${release.semantic_version.replace(/^v/, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  async function publish() {
    setLoading("publish");
    try {
      const res = await fetch(`/api/releases/${release.id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  const isDraft = release.status === "draft";

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={generateBundle}
        disabled={loading !== null || itemCount === 0}
      >
        {loading === "bundle" ? "Generating…" : "Generate bundle"}
      </Button>
      {isDraft && (
        <Button onClick={publish} disabled={loading !== null || itemCount === 0}>
          {loading === "publish" ? "Publishing…" : "Publish release"}
        </Button>
      )}
    </div>
  );
}
