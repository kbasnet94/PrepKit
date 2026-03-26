"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  X,
  ExternalLink,
  ShoppingCart,
  BookOpen,
} from "lucide-react";
import { buildAmazonSearchUrl } from "@/lib/amazon";
import type { Tool, ToolVariant } from "@/types/database";

type LinkedGuide = {
  slug: string;
  title: string;
  optional: boolean;
  context: string | null;
};

export function ToolEditForm({
  tool,
  linkedGuides,
}: {
  tool: Tool;
  linkedGuides: LinkedGuide[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState(tool.name);
  const [category, setCategory] = useState(tool.category);
  const [description, setDescription] = useState(tool.description);
  const [icon, setIcon] = useState(tool.icon ?? "");
  const [useCases, setUseCases] = useState<string[]>(tool.use_cases ?? []);
  const [amazonKeywords, setAmazonKeywords] = useState(
    tool.amazon_search_keywords ?? ""
  );
  const [amazonEnabled, setAmazonEnabled] = useState(tool.amazon_enabled);
  const [variants, setVariants] = useState<ToolVariant[]>(
    tool.variants ?? []
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Use cases array management ────────────────────────────────────────────
  const addUseCase = () => setUseCases([...useCases, ""]);
  const updateUseCase = (i: number, val: string) => {
    const next = [...useCases];
    next[i] = val;
    setUseCases(next);
  };
  const removeUseCase = (i: number) =>
    setUseCases(useCases.filter((_, idx) => idx !== i));

  // ── Variants array management ───────────────────────────────────────────
  const addVariant = () => {
    if (variants.length >= 4) return;
    setVariants([
      ...variants,
      { label: "", description: "", amazonSearchKeywords: "" },
    ]);
  };
  const updateVariant = (
    i: number,
    field: keyof ToolVariant,
    val: string
  ) => {
    const next = [...variants];
    next[i] = { ...next[i], [field]: val };
    setVariants(next);
  };
  const removeVariant = (i: number) =>
    setVariants(variants.filter((_, idx) => idx !== i));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          description: description.trim(),
          icon: icon.trim() || null,
          use_cases: useCases.filter((u) => u.trim()),
          amazon_search_keywords: amazonKeywords.trim() || null,
          amazon_enabled: amazonEnabled,
          variants: variants.filter((v) => v.label.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Save failed" });
      } else {
        setMessage({ type: "success", text: "Tool saved successfully." });
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Amazon preview URL ────────────────────────────────────────────────────
  const amazonPreviewUrl = amazonKeywords.trim()
    ? buildAmazonSearchUrl(amazonKeywords.trim())
    : null;

  return (
    <div className="space-y-6">
      {/* ── Back + title ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tools">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {tool.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Edit tool definition and Amazon settings
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main form (2 cols) ───────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Core fields */}
          <Card>
            <CardHeader>
              <CardTitle>Tool Details</CardTitle>
              <CardDescription>
                Canonical definition shared across all guides
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Flashlight"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="equipment"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="A reliable light source for emergency situations..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">
                  Icon name{" "}
                  <span className="text-muted-foreground font-normal">
                    (Ionicons identifier for mobile display)
                  </span>
                </Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="flashlight-outline"
                />
              </div>
            </CardContent>
          </Card>

          {/* Use cases */}
          <Card>
            <CardHeader>
              <CardTitle>Use Cases</CardTitle>
              <CardDescription>
                Short descriptions of when and why someone would need this tool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {useCases.map((uc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={uc}
                    onChange={(e) => updateUseCase(i, e.target.value)}
                    placeholder="Signal for help in remote wilderness..."
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeUseCase(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addUseCase}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add use case
              </Button>
            </CardContent>
          </Card>

          {/* Amazon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Amazon Affiliate
              </CardTitle>
              <CardDescription>
                Configure Amazon search link for this tool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="amazonEnabled"
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="amazonEnabled"
                      checked={amazonEnabled}
                      onChange={(e) => setAmazonEnabled(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer-checked:bg-primary h-5 w-9 rounded-full bg-gray-300 transition-colors dark:bg-gray-600" />
                    <div className="peer-checked:translate-x-4 absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform" />
                  </div>
                  <span className="text-sm font-medium">
                    {amazonEnabled
                      ? "Amazon link enabled"
                      : "Amazon link disabled"}
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amazonKeywords">
                  Amazon search keywords
                </Label>
                <Input
                  id="amazonKeywords"
                  value={amazonKeywords}
                  onChange={(e) => setAmazonKeywords(e.target.value)}
                  placeholder="hand crank emergency radio NOAA weather"
                  disabled={!amazonEnabled}
                />
                <p className="text-muted-foreground text-xs">
                  These keywords are used in the Amazon search URL. They can
                  differ from the tool name for better results.
                </p>
              </div>

              {amazonPreviewUrl && amazonEnabled && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Preview URL
                  </p>
                  <a
                    href={amazonPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 text-sm break-all hover:underline"
                  >
                    {amazonPreviewUrl}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants / Types */}
          <Card
            className={
              !amazonEnabled ? "opacity-50 pointer-events-none" : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-base">Variants / Types</span>
                <Badge variant="secondary" className="ml-auto">
                  {variants.length}/4
                </Badge>
              </CardTitle>
              <CardDescription>
                Add 2-4 product types users should know about. Leave empty
                for tools with only one type (e.g., Paracord, Duct Tape).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {variants.map((v, i) => (
                <div
                  key={i}
                  className="relative rounded-lg border bg-muted/20 p-4 space-y-3"
                >
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-2 right-2"
                    onClick={() => removeVariant(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={v.label}
                      onChange={(e) =>
                        updateVariant(i, "label", e.target.value)
                      }
                      placeholder="Hand-Crank Radio"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={v.description}
                      onChange={(e) =>
                        updateVariant(i, "description", e.target.value)
                      }
                      rows={2}
                      placeholder="No batteries needed. Most models include NOAA weather bands and a built-in flashlight."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Amazon search keywords</Label>
                    <Input
                      value={v.amazonSearchKeywords}
                      onChange={(e) =>
                        updateVariant(
                          i,
                          "amazonSearchKeywords",
                          e.target.value
                        )
                      }
                      placeholder="hand crank emergency radio NOAA weather"
                    />
                  </div>

                  {v.amazonSearchKeywords.trim() && (
                    <div className="rounded border bg-muted/30 px-2.5 py-1.5">
                      <a
                        href={buildAmazonSearchUrl(
                          v.amazonSearchKeywords.trim()
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs break-all hover:underline"
                      >
                        {buildAmazonSearchUrl(
                          v.amazonSearchKeywords.trim()
                        )}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addVariant}
                disabled={variants.length >= 4 || !amazonEnabled}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add variant
                {variants.length >= 4 && " (max reached)"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar (1 col) ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Save button + status */}
          <Card>
            <CardContent className="space-y-3 pt-6">
              <Button
                onClick={handleSave}
                disabled={saving || isPending}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {message && (
                <p
                  className={`text-sm ${
                    message.type === "error"
                      ? "text-destructive"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {message.text}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Linked guides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Linked Guides
                <Badge variant="secondary" className="ml-auto">
                  {linkedGuides.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedGuides.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Not used in any guides yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {linkedGuides.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/guides/${g.slug}`}
                        className="text-primary text-sm hover:underline"
                      >
                        {g.title}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {g.optional && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            optional
                          </Badge>
                        )}
                        {g.context && (
                          <span className="text-muted-foreground text-xs line-clamp-1">
                            {g.context}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-xs">{tool.id.slice(0, 8)}...</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {new Date(tool.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>
                  {new Date(tool.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
