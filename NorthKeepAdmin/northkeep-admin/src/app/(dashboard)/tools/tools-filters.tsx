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

export function ToolsFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => router.push(`/tools?${next.toString()}`));
    },
    [router, searchParams, startTransition]
  );

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const amazon = searchParams.get("amazon") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Input
        placeholder="Search tools..."
        className="max-w-xs"
        defaultValue={q}
        onChange={(e) => {
          const v = e.target.value;
          const next = new URLSearchParams(searchParams.toString());
          if (v) next.set("q", v);
          else next.delete("q");
          startTransition(() => router.push(`/tools?${next.toString()}`));
        }}
      />
      <Select
        value={category || "all"}
        onValueChange={(v) => setParam("category", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={amazon || "all"}
        onValueChange={(v) => setParam("amazon", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Amazon status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tools</SelectItem>
          <SelectItem value="enabled">Amazon enabled</SelectItem>
          <SelectItem value="disabled">Amazon disabled</SelectItem>
        </SelectContent>
      </Select>
      {isPending && (
        <span className="text-muted-foreground text-sm">Updating...</span>
      )}
    </div>
  );
}
