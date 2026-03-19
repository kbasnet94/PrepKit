/**
 * Creates a new "needs_images" version for 13 published guides,
 * pre-populated with image sourcing stubs.
 *
 * Usage: npx tsx scripts/flag-guides-for-images.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
try {
  const envLocal = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of envLocal.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    const match = trimmed.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* .env.local may not exist */ }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ImageStub {
  key: string;
  description: string;
  caption: string;
  altText: string;
  associatedStepIndex: number | null;
  storageUrl: null;
}

const IMAGE_STUBS: Record<string, ImageStub[]> = {
  "ground-to-air-symbols-for-aircraft": [
    { key: "symbol-chart", description: "Full 9-symbol ground-to-air signaling chart with each symbol, its name, and meaning. Line art style, black on white.", caption: "Standard ground-to-air symbols chart", altText: "Chart showing nine ground-to-air signals including SOS, need medical help, and need food", associatedStepIndex: null, storageUrl: null },
    { key: "sos-symbol", description: "Close-up of the SOS/distress symbol: a large X formed by two logs or stones. Include scale reference. Line art.", caption: "SOS / distress symbol close-up", altText: "Ground-to-air SOS distress symbol: large X made from logs", associatedStepIndex: 0, storageUrl: null },
  ],
  "cardiac-arrest-cpr-steps": [
    { key: "hand-position", description: "Rescuer kneeling beside victim, interlaced hands on center of lower sternum. Arms straight. No brand markings.", caption: "Hand placement on chest", altText: "Rescuer's interlaced hands positioned on center of chest for CPR compressions", associatedStepIndex: 1, storageUrl: null },
    { key: "airway-open", description: "Head-tilt chin-lift: one hand on forehead, two fingers under chin, tilting head back. Side profile.", caption: "Head-tilt chin-lift for airway", altText: "Head-tilt chin-lift technique to open airway for rescue breaths", associatedStepIndex: 6, storageUrl: null },
    { key: "compression-depth", description: "Side-view diagram: dashed line indicating target compression depth of ~2 inches (5 cm) on adult chest.", caption: "Compression depth guide (~2 in)", altText: "Diagram showing CPR compression depth of 2 inches on adult chest", associatedStepIndex: 1, storageUrl: null },
  ],
  "choking-responsive-adult-or-child": [
    { key: "heimlich-standing", description: "Rescuer standing behind adult with fist above navel, other hand covering fist, ready for abdominal thrust. Both facing away.", caption: "Abdominal thrust position (standing)", altText: "Rescuer positioned behind choking adult for standing abdominal thrusts", associatedStepIndex: 1, storageUrl: null },
    { key: "child-position", description: "Rescuer kneeling behind child ~5 years old, fist at correct lower abdominal position. Side view.", caption: "Positioning for a child", altText: "Rescuer kneeling behind child for age-appropriate Heimlich maneuver", associatedStepIndex: 2, storageUrl: null },
  ],
  "choking-unresponsive-adult-or-child": [
    { key: "ground-position", description: "Unconscious adult on back, rescuer straddling thighs, hands on abdomen just above navel. Overhead view.", caption: "Victim position on ground", altText: "Rescuer straddling unconscious choking victim on ground, preparing abdominal thrusts", associatedStepIndex: 0, storageUrl: null },
    { key: "ground-thrusts", description: "Heel of hand 1-2 inches above navel, second hand on top. Overhead view close-up.", caption: "Abdominal thrusts on ground", altText: "Hand placement for abdominal thrusts on unconscious choking victim", associatedStepIndex: 1, storageUrl: null },
  ],
  "mirror-and-light-signaling-land-day-and-night": [
    { key: "mirror-hold", description: "Person holding signal mirror at arm's length, angled toward sun. Shows correct grip and tilt. Background: open sky.", caption: "How to hold and angle the mirror", altText: "Person holding signal mirror at arm's length angled toward sun", associatedStepIndex: 0, storageUrl: null },
    { key: "finger-triangle", description: "V-finger triangle aiming: person forms a V with two fingers, aligns reflected light spot with target through the V. POV perspective.", caption: "Finger-triangle aiming method", altText: "Finger V-triangle aiming technique for directing signal mirror reflection", associatedStepIndex: 1, storageUrl: null },
  ],
  "bleeding-control-pressure-first": [
    { key: "direct-pressure", description: "Both hands flat on wound with folded cloth, firm downward pressure. Wound on forearm. No visible blood. Instructional style.", caption: "Both hands flat on wound with cloth", altText: "Both hands applying direct pressure on wound with cloth for bleeding control", associatedStepIndex: 0, storageUrl: null },
    { key: "wound-packing", description: "Gauze being packed into deep thigh wound using fingers. Packing motion shown by arrow. Clinical but not graphic.", caption: "Packing a deep wound", altText: "Gauze being packed into a deep wound for hemorrhage control", associatedStepIndex: 2, storageUrl: null },
  ],
  "immobilize-sprain-or-fracture": [
    { key: "improvised-splint", description: "Forearm splinted with two padded sticks, secured with fabric strips above and below injury. Clear knot placement.", caption: "Splint with padding and bandage", altText: "Improvised splint on forearm using sticks and cloth strips", associatedStepIndex: 2, storageUrl: null },
    { key: "ankle-wrap", description: "Figure-8 ankle wrap: 3 sequential panels — starting position, around heel, completing over top of foot.", caption: "Figure-8 ankle wrap", altText: "Sequential diagram of figure-8 ankle wrap technique", associatedStepIndex: 3, storageUrl: null },
  ],
  "natural-lean-to-frame-shelter": [
    { key: "ridgepole-setup", description: "Long straight pole (6-8 ft) resting in forks of two small trees at waist height. Background: forest.", caption: "Ridge pole between two trees", altText: "Long pole resting in forks of two trees forming lean-to ridge", associatedStepIndex: 0, storageUrl: null },
    { key: "angled-poles", description: "Multiple support poles leaning against ridge pole at ~45 degrees, evenly spaced.", caption: "Support poles leaning against ridge", altText: "Angled support poles placed against ridgepole for lean-to frame", associatedStepIndex: 1, storageUrl: null },
    { key: "completed-leanto", description: "Completed lean-to covered with pine boughs overlapping like shingles. Person standing beside for scale.", caption: "Finished lean-to structure", altText: "Completed natural lean-to shelter covered with branches and boughs", associatedStepIndex: null, storageUrl: null },
  ],
  "debris-hut-emergency-overnight": [
    { key: "ridgepole-frame", description: "Ridgepole (10-12 ft) with one end on forked-stick support (2 ft high) and other end on ground. Side profile.", caption: "Ridgepole on forked-stick frame", altText: "Ridgepole resting on forked-stick support showing basic debris hut frame", associatedStepIndex: 0, storageUrl: null },
    { key: "ribbing", description: "Cross-stick ribbing along both sides of ridgepole at 45 degrees. Ribcage shape. Slightly overhead view.", caption: "Cross-stick ribbing along ridgepole", altText: "Cross-stick ribbing on both sides of ridgepole for debris hut frame", associatedStepIndex: 1, storageUrl: null },
    { key: "completed-hut", description: "Ridgepole and ribbing covered with at least 3 feet of leaf debris. Small entrance visible. Person for scale.", caption: "Finished debris hut with insulation", altText: "Completed debris hut shelter covered in deep leaf and debris insulation", associatedStepIndex: null, storageUrl: null },
  ],
  "fast-tarp-lean-to-for-wind-and-rain": [
    { key: "ridgeline-tarp", description: "Tarp draped over ridgeline cord tied between two trees. One side staked to ground at 45 degrees.", caption: "Tarp draped over ridgeline", altText: "Tarp draped over ridgeline cord forming lean-to shelter", associatedStepIndex: 0, storageUrl: null },
    { key: "stake-pattern", description: "Top-down view: ridgeline cord anchors at 2 trees, 4 corner stakes shown with angles.", caption: "Tarp edge stake layout", altText: "Top-down diagram showing stake pattern for tarp lean-to shelter", associatedStepIndex: 1, storageUrl: null },
    { key: "completed-tarp", description: "Finished lean-to from front-side. Interior space visible, back wall staked taut. Person sheltering inside for scale.", caption: "Finished tarp lean-to", altText: "Completed tarp lean-to shelter with person inside for scale", associatedStepIndex: null, storageUrl: null },
  ],
  "low-a-frame-tarp-shelter-for-cold-nights": [
    { key: "low-ridgeline", description: "Ridge cord strung at knee height (~18-24 in) between two trees. Shows taut-line hitch adjustment.", caption: "Low ridge cord strung between trees", altText: "Low ridgeline cord at knee height between two trees for A-frame tarp", associatedStepIndex: 0, storageUrl: null },
    { key: "tarp-over-ridge", description: "Tarp draped symmetrically over low ridgeline, both sides staked to ground. Low A-frame profile. Side view.", caption: "Tarp draped and staked out", altText: "Tarp draped over low ridgeline and staked to ground forming A-frame", associatedStepIndex: 1, storageUrl: null },
    { key: "completed-aframe", description: "End-on view of completed low A-frame. Narrow entrance profile that retains body heat. Optional sleeping pad visible.", caption: "Finished A-frame from end view", altText: "End view of completed low A-frame tarp shelter showing heat-retaining profile", associatedStepIndex: null, storageUrl: null },
  ],
  "sos-morse-code": [
    { key: "sos-pattern", description: "SOS Morse code: three dots, three dashes, three dots (· · · — — — · · ·). Bold sans-serif, clearly spaced.", caption: "SOS dot-dash-dot pattern chart", altText: "SOS Morse code pattern: three short signals, three long, three short", associatedStepIndex: null, storageUrl: null },
    { key: "timing-diagram", description: "Horizontal timing bar: short (1 unit), long (3 units), element gap (1), letter gap (3). Full SOS sequence labeled with durations.", caption: "Signal vs pause timing guide", altText: "Timing diagram for SOS Morse code signal and pause durations", associatedStepIndex: 1, storageUrl: null },
  ],
  "layering-clothing-and-bedding-for-maximum-warmth": [
    { key: "layer-diagram", description: "Cross-section body diagram: base layer (moisture-wicking), mid layer (fleece/down insulation), outer layer (wind/waterproof shell). Arrows show heat/moisture flow.", caption: "Base / mid / outer layer diagram", altText: "Diagram of three clothing layers for warmth: base, insulating mid, and outer shell", associatedStepIndex: null, storageUrl: null },
    { key: "heat-trapping", description: "Cutaway diagram: trapped dead air between fabric layers, small arrows showing warm air held between fibers. Annotation: 'Trapped air = insulation'.", caption: "Dead-air insulation concept", altText: "Diagram showing dead-air insulation trapped between fabric layers for warmth", associatedStepIndex: 0, storageUrl: null },
  ],
};

async function main() {
  console.log("=== flag-guides-for-images ===\n");

  const slugs = Object.keys(IMAGE_STUBS);
  let created = 0, skipped = 0, failed = 0;

  for (const slug of slugs) {
    // 1. Find the guide
    const { data: guide, error: guideErr } = await supabase
      .from("guides")
      .select("id, slug, title")
      .eq("slug", slug)
      .single();

    if (guideErr || !guide) {
      console.error(`  ✗ ${slug}: guide not found`);
      failed++;
      continue;
    }

    // 2. Idempotency: skip if needs_images version already exists
    const { data: existing } = await supabase
      .from("guide_versions")
      .select("id, version_number")
      .eq("guide_id", guide.id)
      .eq("review_status", "needs_images")
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭  ${slug}: v${existing.version_number} already flagged, skipping`);
      skipped++;
      continue;
    }

    // 3. Fetch latest version to copy content from
    const { data: latest, error: latestErr } = await supabase
      .from("guide_versions")
      .select("*")
      .eq("guide_id", guide.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    if (latestErr || !latest) {
      console.error(`  ✗ ${slug}: no version found`);
      failed++;
      continue;
    }

    // 4. Validate + clamp stub step indexes
    const stepCount = (latest.step_by_step_actions as string[]).length;
    const stubs = IMAGE_STUBS[slug].map((stub) => {
      if (stub.associatedStepIndex !== null && stub.associatedStepIndex >= stepCount) {
        console.warn(
          `  ⚠  ${slug}: stub "${stub.key}" stepIndex ${stub.associatedStepIndex} ` +
          `out of range (${stepCount} steps) — setting to null`
        );
        return { ...stub, associatedStepIndex: null };
      }
      return stub;
    });

    // 5. Insert new version directly with needs_images status
    const { data: newVersion, error: insertErr } = await supabase
      .from("guide_versions")
      .insert({
        guide_id: guide.id,
        version_number: latest.version_number + 1,
        title: latest.title,
        category_id: latest.category_id,
        parent_topic_id: latest.parent_topic_id,
        layer: latest.layer,
        guide_type: latest.guide_type,
        summary: latest.summary,
        quick_answer: latest.quick_answer,
        when_to_use: latest.when_to_use,
        preferred_action: latest.preferred_action,
        backup_action: latest.backup_action,
        step_by_step_actions: latest.step_by_step_actions,
        warnings: latest.warnings,
        what_not_to_do: latest.what_not_to_do,
        red_flags: latest.red_flags,
        preparedness_tips: latest.preparedness_tips,
        source_quality: latest.source_quality,
        content_status: latest.content_status,
        integration_decision: latest.integration_decision,
        upgrades_guide: latest.upgrades_guide,
        related_guides: latest.related_guides,
        source_references: latest.source_references,
        app_tags: latest.app_tags,
        notes: latest.notes,
        response_role: latest.response_role,
        constraint_tags: latest.constraint_tags,
        blocked_by_constraints: latest.blocked_by_constraints,
        alternative_to_guide_slugs: latest.alternative_to_guide_slugs,
        images: stubs,
        review_status: "needs_images",
        change_summary: "Flagged for image sourcing",
      })
      .select("id, version_number")
      .single();

    if (insertErr || !newVersion) {
      console.error(`  ✗ ${slug}: insert failed — ${insertErr?.message}`);
      failed++;
      continue;
    }

    console.log(`  ✓ ${slug}: created v${newVersion.version_number} (${stubs.length} stubs)`);
    created++;
  }

  console.log(`\nDone — Created: ${created}  Skipped: ${skipped}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
