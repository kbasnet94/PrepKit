"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "needs_images", label: "Needs images" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground",
  in_review: "text-blue-600 dark:text-blue-400",
  needs_images: "text-amber-600 dark:text-amber-400",
  approved: "text-green-600 dark:text-green-400",
  archived: "text-muted-foreground opacity-60",
  published: "text-purple-600 dark:text-purple-400",
};

export function ReviewStatusSelect({
  versionId,
  currentStatus,
}: {
  versionId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // "published" is managed through releases — show read-only
  if (currentStatus === "published" && status === "published") {
    return (
      <span className={`text-sm font-medium ${STATUS_COLORS["published"]}`}>
        Published
      </span>
    );
  }

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    const previous = status;
    setStatus(newStatus);
    setError(null);

    try {
      const res = await fetch(`/api/guides/versions/${versionId}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setStatus(previous);
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  const knownStatus = STATUSES.some((s) => s.value === status);

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={knownStatus ? (status as Status) : "draft"}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger
          className={`h-7 w-[120px] border-0 bg-transparent px-2 text-sm shadow-none focus:ring-1 ${
            STATUS_COLORS[status] ?? ""
          } ${isPending ? "opacity-50" : ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-sm">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <span className="text-destructive px-2 text-xs">{error}</span>
      )}
    </div>
  );
}
