"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GuideVersion } from "@/types/database";

export function GuidePreview({ version }: { version: GuideVersion }) {
  const whenToUse = Array.isArray(version.when_to_use) ? version.when_to_use : [];
  const steps = Array.isArray(version.step_by_step_actions) ? version.step_by_step_actions : [];
  const warnings = Array.isArray(version.warnings) ? version.warnings : [];
  const whatNotToDo = Array.isArray(version.what_not_to_do) ? version.what_not_to_do : [];
  const redFlags = Array.isArray(version.red_flags) ? version.red_flags : [];
  const tips = Array.isArray(version.preparedness_tips) ? version.preparedness_tips : [];
  const sources = Array.isArray(version.source_references) ? version.source_references : [];
  const related = Array.isArray(version.related_guides) ? version.related_guides : [];
  const responseRole = version.response_role ?? null;
  const constraintTags = Array.isArray(version.constraint_tags) ? version.constraint_tags : [];
  const blockedByConstraints = Array.isArray(version.blocked_by_constraints) ? version.blocked_by_constraints : [];
  const alternativeSlugs = Array.isArray(version.alternative_to_guide_slugs) ? version.alternative_to_guide_slugs : [];
  const images = Array.isArray(version.images) ? version.images : [];
  const pendingImages = images.filter((img) => !img.storageUrl);
  const uploadedImages = images.filter((img) => !!img.storageUrl);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{version.guide_type}</Badge>
          <Badge variant="outline">{version.layer}</Badge>
          {responseRole && (
            <Badge variant="outline">Role: {responseRole}</Badge>
          )}
          {version.source_quality && (
            <Badge variant="outline">Source: {version.source_quality}</Badge>
          )}
        </div>
        <CardTitle className="text-xl">{version.title}</CardTitle>
        {version.summary && (
          <p className="text-muted-foreground text-sm">{version.summary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {version.quick_answer && (
          <section>
            <h3 className="mb-1 font-medium text-sm">Quick answer</h3>
            <p className="text-sm">{version.quick_answer}</p>
          </section>
        )}
        {whenToUse.length > 0 && (
          <section>
            <h3 className="mb-1 font-medium text-sm">When to use</h3>
            <ul className="list-inside list-disc text-sm">
              {whenToUse.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        {(version.preferred_action || version.backup_action) && (
          <section>
            {version.preferred_action && (
              <>
                <h3 className="mb-1 font-medium text-sm">Preferred action</h3>
                <p className="text-sm">{version.preferred_action}</p>
              </>
            )}
            {version.backup_action && (
              <>
                <h3 className="mb-1 mt-2 font-medium text-sm">Backup action</h3>
                <p className="text-sm">{version.backup_action}</p>
              </>
            )}
          </section>
        )}
        {steps.length > 0 && (
          <section>
            <h3 className="mb-1 font-medium text-sm">Steps</h3>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        )}
        {warnings.length > 0 && (
          <section className="rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <h3 className="mb-1 font-medium text-amber-800 text-sm dark:text-amber-200">Warnings</h3>
            <ul className="list-inside list-disc text-amber-900 text-sm dark:text-amber-100">
              {warnings.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        {whatNotToDo.length > 0 && (
          <section>
            <h3 className="mb-1 font-medium text-sm">What not to do</h3>
            <ul className="list-inside list-disc text-sm">
              {whatNotToDo.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        {redFlags.length > 0 && (
          <section className="rounded-md border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
            <h3 className="mb-1 font-medium text-red-800 text-sm dark:text-red-200">Red flags</h3>
            <ul className="list-inside list-disc text-red-900 text-sm dark:text-red-100">
              {redFlags.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        {tips.length > 0 && (
          <section className="rounded-md border border-green-200 bg-green-50/50 p-3 dark:border-green-900/50 dark:bg-green-950/20">
            <h3 className="mb-1 font-medium text-green-800 text-sm dark:text-green-200">Preparedness tips</h3>
            <ul className="list-inside list-disc text-green-900 text-sm dark:text-green-100">
              {tips.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}
        {sources.length > 0 && (
          <section>
            <h3 className="mb-1 font-medium text-sm">Sources</h3>
            <ul className="space-y-2 text-sm">
              {sources.map((s, i) => (
                <li key={i} className="rounded border p-2">
                  <span className="font-medium">{typeof s === "object" && s && "title" in s ? String((s as { title: string }).title) : String(s)}</span>
                  {"organization" in s && (s as { organization?: string }).organization && (
                    <span className="text-muted-foreground ml-1">— {(s as { organization: string }).organization}</span>
                  )}
                  {"url" in s && (s as { url?: string }).url && (
                    <a
                      href={(s as { url: string }).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary ml-1 block truncate hover:underline"
                    >
                      {(s as { url: string }).url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {related.length > 0 && (
          <section>
            <h3 className="mb-1 font-medium text-sm">Related guides</h3>
            <p className="text-muted-foreground text-sm">{related.join(", ")}</p>
          </section>
        )}
        {images.length > 0 && (
          <section className="rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
            <h3 className="mb-2 font-medium text-blue-800 text-sm dark:text-blue-200">
              Images ({uploadedImages.length} uploaded, {pendingImages.length} pending)
            </h3>
            <ul className="space-y-2">
              {images.map((img, i) => (
                <li key={i} className="text-xs">
                  <span className="font-mono font-medium">{img.key}</span>
                  <span className="text-muted-foreground ml-1">
                    · {img.associatedStepIndex === null ? "Gallery" : `Step ${img.associatedStepIndex + 1}`}
                    · {img.storageUrl ? (
                      <span className="text-green-700 dark:text-green-400">Uploaded</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">Awaiting upload</span>
                    )}
                  </span>
                  {img.caption && <span className="text-muted-foreground ml-1">— {img.caption}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {(constraintTags.length > 0 || blockedByConstraints.length > 0 || alternativeSlugs.length > 0) && (
          <section className="rounded-md border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/20">
            <h3 className="mb-1 font-medium text-slate-800 text-sm dark:text-slate-200">Constraint metadata</h3>
            {constraintTags.length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Boost when:</span> {constraintTags.join(", ")}
              </p>
            )}
            {blockedByConstraints.length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Demote when:</span> {blockedByConstraints.join(", ")}
              </p>
            )}
            {alternativeSlugs.length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Alternative to:</span> {alternativeSlugs.join(", ")}
              </p>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
