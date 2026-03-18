"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateReleaseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [releaseName, setReleaseName] = useState("");
  const [semanticVersion, setSemanticVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          release_name: releaseName || semanticVersion,
          semantic_version: semanticVersion,
          release_notes: releaseNotes || null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const json = JSON.parse(text);
          if (json.message?.includes("duplicate key") && json.message?.includes("semantic_version")) {
            msg = `Version "${semanticVersion}" already exists. Choose a different version.`;
          } else {
            msg = json.message ?? json.error ?? text;
          }
        } catch {}
        throw new Error(msg);
      }
      setOpen(false);
      setReleaseName("");
      setSemanticVersion("");
      setReleaseNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create release");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger asChild>
        <Button>Create release</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create release</DialogTitle>
          <DialogDescription>
            Create a new release. After creating, open it to add approved guide versions and generate the bundle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="releaseName">Release name</Label>
            <Input
              id="releaseName"
              value={releaseName}
              onChange={(e) => setReleaseName(e.target.value)}
              placeholder="e.g. Winter 2026"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="semanticVersion">Semantic version</Label>
            <Input
              id="semanticVersion"
              value={semanticVersion}
              onChange={(e) => { setSemanticVersion(e.target.value); setError(null); }}
              placeholder="e.g. v1.1.0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="releaseNotes">Release notes</Label>
            <Input
              id="releaseNotes"
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !semanticVersion.trim()}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
