"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GuideVersion, ContentGap } from "@/types/database";
import { validateConstraintTags } from "@/lib/constants/constraint-tags";
import { isValidResponseRole } from "@/lib/constants/response-roles";

type SourceRef = { title: string; organization?: string; url?: string; whyUseful?: string };

export function GuideEditorForm({
  guideId,
  version,
}: {
  guideId: string;
  version: GuideVersion;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [title, setTitle] = useState(version.title);
  const [summary, setSummary] = useState(version.summary ?? "");
  const [quickAnswer, setQuickAnswer] = useState(version.quick_answer ?? "");
  const [preferredAction, setPreferredAction] = useState(version.preferred_action ?? "");
  const [backupAction, setBackupAction] = useState(version.backup_action ?? "");
  const [whenToUse, setWhenToUse] = useState<string[]>(Array.isArray(version.when_to_use) ? version.when_to_use : []);
  const [stepByStepActions, setStepByStepActions] = useState<string[]>(
    Array.isArray(version.step_by_step_actions) ? version.step_by_step_actions : []
  );
  const [warnings, setWarnings] = useState<string[]>(Array.isArray(version.warnings) ? version.warnings : []);
  const [whatNotToDo, setWhatNotToDo] = useState<string[]>(Array.isArray(version.what_not_to_do) ? version.what_not_to_do : []);
  const [redFlags, setRedFlags] = useState<string[]>(Array.isArray(version.red_flags) ? version.red_flags : []);
  const [preparednessTips, setPreparednessTips] = useState<string[]>(
    Array.isArray(version.preparedness_tips) ? version.preparedness_tips : []
  );
  const [sourceReferences, setSourceReferences] = useState<SourceRef[]>(
    Array.isArray(version.source_references) ? (version.source_references as SourceRef[]) : []
  );
  const [appTagsStr, setAppTagsStr] = useState(
    Array.isArray(version.app_tags) ? version.app_tags.join(", ") : ""
  );
  const [notes, setNotes] = useState(version.notes ?? "");
  const [contentGaps, setContentGaps] = useState<ContentGap[]>(
    Array.isArray(version.content_gaps) ? version.content_gaps : []
  );
  const [responseRole, setResponseRole] = useState<string>(
    (version as { response_role?: string | null }).response_role ?? ""
  );
  const [constraintTags, setConstraintTags] = useState<string[]>(
    Array.isArray((version as { constraint_tags?: string[] }).constraint_tags)
      ? (version as { constraint_tags: string[] }).constraint_tags
      : []
  );
  const [blockedByConstraints, setBlockedByConstraints] = useState<string[]>(
    Array.isArray((version as { blocked_by_constraints?: string[] }).blocked_by_constraints)
      ? (version as { blocked_by_constraints: string[] }).blocked_by_constraints
      : []
  );
  const [alternativeToGuideSlugs, setAlternativeToGuideSlugs] = useState<string[]>(
    Array.isArray((version as { alternative_to_guide_slugs?: string[] }).alternative_to_guide_slugs)
      ? (version as { alternative_to_guide_slugs: string[] }).alternative_to_guide_slugs
      : []
  );

  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""]);
  };
  const updateArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const addSource = () => {
    setSourceReferences((prev) => [...prev, { title: "" }]);
  };
  const updateSource = (index: number, field: keyof SourceRef, value: string) => {
    setSourceReferences((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const removeSource = (index: number) => {
    setSourceReferences((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSaveDraft() {
    setSaving(true);
    setMessage(null);
    try {
      if (responseRole && !isValidResponseRole(responseRole)) {
        setMessage({ type: "error", text: "Invalid response role. Use: primary, backup, supporting, reference." });
        setSaving(false);
        return;
      }
      const ctFiltered = constraintTags.filter(Boolean);
      const bcFiltered = blockedByConstraints.filter(Boolean);
      const ctResult = validateConstraintTags(ctFiltered);
      const bcResult = validateConstraintTags(bcFiltered);
      if (ctResult.invalid.length > 0 || bcResult.invalid.length > 0) {
        const invalid = [...new Set([...ctResult.invalid, ...bcResult.invalid])];
        setMessage({ type: "error", text: `Invalid constraint tags: ${invalid.join(", ")}. Use approved tags from the registry.` });
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/guides/${guideId}/versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary: summary || null,
          quick_answer: quickAnswer || null,
          preferred_action: preferredAction || null,
          backup_action: backupAction || null,
          when_to_use: whenToUse.filter(Boolean),
          step_by_step_actions: stepByStepActions.filter(Boolean),
          warnings,
          what_not_to_do: whatNotToDo,
          red_flags: redFlags,
          preparedness_tips: preparednessTips,
          source_references: sourceReferences.filter((s) => s.title),
          app_tags: appTagsStr.split(/[\n,]/).map((t) => t.trim()).filter(Boolean),
          notes: notes || null,
          content_gaps: contentGaps.filter((g) => g.slug || g.description),
          response_role: responseRole || null,
          constraint_tags: ctResult.valid,
          blocked_by_constraints: bcResult.valid,
          alternative_to_guide_slugs: alternativeToGuideSlugs.filter(Boolean),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || res.statusText);
      }
      setMessage({ type: "success", text: "Draft saved." });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit version {version.version_number}</CardTitle>
        <p className="text-muted-foreground text-sm">Save as draft. Use Review Queue to submit for review or publish.</p>
        {message && (
          <p className={message.type === "error" ? "text-destructive text-sm" : "text-green-600 text-sm dark:text-green-400"}>
            {message.text}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="quickAnswer">Quick answer</Label>
          <Textarea id="quickAnswer" value={quickAnswer} onChange={(e) => setQuickAnswer(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>When to use</Label>
          {whenToUse.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={(e) => updateArrayItem(setWhenToUse, i, e.target.value)} placeholder="When to use this guide" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setWhenToUse, i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setWhenToUse)}>
            + Add when to use
          </Button>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="preferredAction">Preferred action</Label>
          <Textarea id="preferredAction" value={preferredAction} onChange={(e) => setPreferredAction(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="backupAction">Backup action</Label>
          <Textarea id="backupAction" value={backupAction} onChange={(e) => setBackupAction(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-2">
          <Label>Step-by-step actions</Label>
          {stepByStepActions.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={(e) => updateArrayItem(setStepByStepActions, i, e.target.value)} placeholder={`Step ${i + 1}`} />
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setStepByStepActions, i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setStepByStepActions)}>
            + Add step
          </Button>
        </div>
        <div className="grid gap-2">
          <Label className="text-amber-700 dark:text-amber-400">Warnings</Label>
          {warnings.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={(e) => updateArrayItem(setWarnings, i, e.target.value)} placeholder="Warning" className="border-amber-200 dark:border-amber-900" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setWarnings, i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setWarnings)}>
            + Add warning
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>What not to do</Label>
          {whatNotToDo.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={(e) => updateArrayItem(setWhatNotToDo, i, e.target.value)} placeholder="What not to do" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setWhatNotToDo, i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setWhatNotToDo)}>
            + Add item
          </Button>
        </div>
        <div className="grid gap-2">
          <Label className="text-red-700 dark:text-red-400">Red flags</Label>
          {redFlags.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={(e) => updateArrayItem(setRedFlags, i, e.target.value)} placeholder="Red flag" className="border-red-200 dark:border-red-900" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setRedFlags, i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setRedFlags)}>
            + Add red flag
          </Button>
        </div>
        <div className="grid gap-2">
          <Label className="text-green-700 dark:text-green-400">Preparedness tips</Label>
          {preparednessTips.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={(e) => updateArrayItem(setPreparednessTips, i, e.target.value)} placeholder="Tip" className="border-green-200 dark:border-green-900" />
              <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setPreparednessTips, i)}>
                −
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setPreparednessTips)}>
            + Add tip
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>Source references</Label>
          {sourceReferences.map((s, i) => (
            <div key={i} className="flex flex-col gap-2 rounded border p-3">
              <div className="flex gap-2">
                <Input placeholder="Title" value={s.title} onChange={(e) => updateSource(i, "title", e.target.value)} />
                <Button type="button" variant="outline" size="icon" onClick={() => removeSource(i)}>
                  −
                </Button>
              </div>
              <Input placeholder="Organization" value={s.organization ?? ""} onChange={(e) => updateSource(i, "organization", e.target.value)} />
              <Input placeholder="URL" value={s.url ?? ""} onChange={(e) => updateSource(i, "url", e.target.value)} />
              <Input placeholder="Why useful" value={s.whyUseful ?? ""} onChange={(e) => updateSource(i, "whyUseful", e.target.value)} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSource}>
            + Add source
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>App tags (comma-separated)</Label>
          <Input
            value={appTagsStr}
            onChange={(e) => setAppTagsStr(e.target.value)}
            placeholder="e.g. fire, outdoors"
          />
        </div>

        {/* Constraint-aware relationship metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Constraint-aware metadata</CardTitle>
            <p className="text-muted-foreground text-sm">
              How this guide behaves within its topic cluster and under different constraints.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Response role</Label>
              <p className="text-muted-foreground text-xs">
                Role of this guide within its parent topic cluster.
              </p>
              <Select value={responseRole || "none"} onValueChange={(v) => setResponseRole(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Constraint tags</Label>
              <p className="text-muted-foreground text-xs">
                Situations where this guide becomes more relevant. Use approved normalized labels (e.g. no_power, at_night).
              </p>
              {constraintTags.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={(e) => updateArrayItem(setConstraintTags, i, e.target.value)} placeholder="Constraint tag" />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setConstraintTags, i)}>−</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setConstraintTags)}>+ Add constraint tag</Button>
            </div>
            <div className="grid gap-2">
              <Label>Blocked by constraints</Label>
              <p className="text-muted-foreground text-xs">
                Situations where this guide should be demoted or hidden. Use approved normalized labels.
              </p>
              {blockedByConstraints.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={(e) => updateArrayItem(setBlockedByConstraints, i, e.target.value)} placeholder="Constraint" />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setBlockedByConstraints, i)}>−</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setBlockedByConstraints)}>+ Add blocked constraint</Button>
            </div>
            <div className="grid gap-2">
              <Label>Alternative to guide slugs</Label>
              <p className="text-muted-foreground text-xs">
                Direct alternatives when another guide&apos;s method is unavailable. Use existing guide slugs.
              </p>
              {alternativeToGuideSlugs.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={(e) => updateArrayItem(setAlternativeToGuideSlugs, i, e.target.value)} placeholder="guide-slug" className="font-mono" />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem(setAlternativeToGuideSlugs, i)}>−</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(setAlternativeToGuideSlugs)}>+ Add alternative slug</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-2">
          <Label htmlFor="notes">Notes (internal)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <div className="grid gap-2">
          <Label className="text-orange-700 dark:text-orange-400">Content gaps</Label>
          <p className="text-muted-foreground text-xs">
            Companion guides that this guide references but don&apos;t exist yet. Flagged during planning gap analysis.
          </p>
          {contentGaps.map((gap, i) => (
            <div key={i} className="flex flex-col gap-2 rounded border border-orange-200 p-3 dark:border-orange-900">
              <div className="flex gap-2">
                <Input
                  placeholder="suggested-slug"
                  value={gap.slug}
                  onChange={(e) => {
                    const next = [...contentGaps];
                    next[i] = { ...next[i], slug: e.target.value };
                    setContentGaps(next);
                  }}
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setContentGaps((prev) => prev.filter((_, j) => j !== i))}>
                  −
                </Button>
              </div>
              <Input
                placeholder="What this guide should cover"
                value={gap.description}
                onChange={(e) => {
                  const next = [...contentGaps];
                  next[i] = { ...next[i], description: e.target.value };
                  setContentGaps(next);
                }}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setContentGaps((prev) => [...prev, { slug: "", description: "" }])}>
            + Add content gap
          </Button>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveDraft} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
