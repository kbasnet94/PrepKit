"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RemoveItemButton({ releaseId, guideId }: { releaseId: string; guideId: string }) {
  const router = useRouter();

  async function remove() {
    const form = new FormData();
    form.set("action", "remove");
    form.set("guideId", guideId);
    const res = await fetch(`/api/releases/${releaseId}/items`, {
      method: "POST",
      body: form,
    });
    if (res.ok) router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={remove}>
      Remove
    </Button>
  );
}
