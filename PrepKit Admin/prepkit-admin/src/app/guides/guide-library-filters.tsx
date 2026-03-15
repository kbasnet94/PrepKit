"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useTransition } from "react";

type Category = { slug: string; name: string };

export function GuideLibraryFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => router.push(`/guides?${next.toString()}`));
    },
    [router, searchParams]
  );

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const responseRole = searchParams.get("responseRole") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Input
        placeholder="Search by title or slug..."
        className="max-w-xs"
        defaultValue={q}
        onChange={(e) => {
          const v = e.target.value;
          const next = new URLSearchParams(searchParams.toString());
          if (v) next.set("q", v);
          else next.delete("q");
          startTransition(() => router.push(`/guides?${next.toString()}`));
        }}
      />
      <Select value={category || "all"} onValueChange={(v) => setParam("category", v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.slug} value={c.slug}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status || "all"} onValueChange={(v) => setParam("status", v === "all" ? "" : v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Review status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="in_review">In review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select value={type || "all"} onValueChange={(v) => setParam("type", v === "all" ? "" : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Guide type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="action_card">Action card</SelectItem>
          <SelectItem value="scenario_guide">Scenario guide</SelectItem>
          <SelectItem value="preparedness_guide">Preparedness guide</SelectItem>
          <SelectItem value="reference_guide">Reference guide</SelectItem>
        </SelectContent>
      </Select>
      <Select value={responseRole || "all"} onValueChange={(v) => setParam("responseRole", v === "all" ? "" : v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Response role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          <SelectItem value="primary">Primary</SelectItem>
          <SelectItem value="backup">Backup</SelectItem>
          <SelectItem value="supporting">Supporting</SelectItem>
          <SelectItem value="reference">Reference</SelectItem>
        </SelectContent>
      </Select>
      {isPending && <span className="text-muted-foreground text-sm">Updating…</span>}
    </div>
  );
}
