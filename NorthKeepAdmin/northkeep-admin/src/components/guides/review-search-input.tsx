"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export function ReviewSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local value in sync when user navigates back/forward.
  // searchParams is an external router state (not component state), so calling
  // setState inside this effect is the correct and intentional pattern here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) {
        params.set("q", next.trim());
      } else {
        params.delete("q");
      }
      router.replace(`/review?${params.toString()}`);
    }, 250);
  }

  function handleClear() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.replace(`/review?${params.toString()}`);
  }

  return (
    <div className="relative w-64">
      <Input
        type="search"
        placeholder="Search guides…"
        value={value}
        onChange={handleChange}
        className="pr-8 h-8 text-sm"
      />
      {value && (
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 text-sm leading-none"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
