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
  { value: "pending", label: "Pending" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground",
  planned: "text-blue-600 dark:text-blue-400",
  completed: "text-green-600 dark:text-green-400",
};

export function RequestStatusSelect({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    const previous = status;
    setStatus(newStatus);
    setError(null);

    try {
      const res = await fetch(`/api/guide-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
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

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={status as Status}
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
