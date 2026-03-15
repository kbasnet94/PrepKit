#!/bin/bash
# Stage the purify-water-bleach consolidation into the admin Review Queue.
# NOTE: This guide was already imported and moved to in_review via Chrome browser tool on 2026-03-15.
# This script is retained for reference and re-runs only.
# Prerequisites: admin app running at localhost:3000
# Usage: cd ~/Desktop/PrepKit/pipeline-dry-run-bleach-consolidation && bash run-import.sh

GUIDE_FILE="$(dirname "$0")/guide-annotated.json"
CHANGE_SUMMARY="Consolidated purify-water-bleach (canonical) and purifying-water-with-household-liquid-bleach (archived) into single authoritative version. Best-of merge: 7 steps (from 4 canonical + 6 archive), 4 whatNotToDo items (archive superset absorbed canonical), 3 preparednessTips (archive had them, canonical had none), 3 real source URLs from canonical. One conflict resolved: wait time standardized to 30 min (clear/warm) / 60 min (cold/cloudy) per EPA guidance. First-ever constraint metadata assigned: responseRole=backup, constraintTags=[no_boiling,no_fire,no_heat_source], blockedByConstraints=[no_bleach], alternativeToGuideSlugs=[purify-water-boiling] — establishes bleach as tier-2 fallback in water safety chain."

echo "=== Step 1: Preview diff ==="
PREVIEW=$(curl -s -X POST "http://localhost:3000/api/guides/import?action=preview" \
  -H "Content-Type: application/json" \
  -d "{\"guide\": $(cat "$GUIDE_FILE")}")

echo "$PREVIEW" | python3 -m json.tool
echo ""
echo "=== Preview complete. Review the diff above. ==="
read -p "Proceed with save? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "=== Step 2: Save ==="
SAVE=$(curl -s -X POST "http://localhost:3000/api/guides/import?action=save" \
  -H "Content-Type: application/json" \
  -d "{\"guide\": $(cat "$GUIDE_FILE"), \"changeSummary\": \"$CHANGE_SUMMARY\"}")

echo "$SAVE" | python3 -m json.tool
echo ""
echo "=== Import complete. Guide is now in the Review Queue at draft status. ==="
echo "Review at: http://localhost:3000/review?filter=draft"
echo ""
echo "=== Step 3: Promote to in_review (requires SUPABASE_URL and SUPABASE_ANON_KEY) ==="
echo "Run the following after extracting versionId from the save response above:"
echo ""
echo "  VERSION_ID=<versionId from save response>"
echo "  curl -s -X PATCH \"\${SUPABASE_URL}/rest/v1/guide_versions?id=eq.\${VERSION_ID}\" \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H \"apikey: \${SUPABASE_ANON_KEY}\" \\"
echo "    -H \"Authorization: Bearer \${SUPABASE_ANON_KEY}\" \\"
echo "    -H 'Prefer: return=representation' \\"
echo "    -d '{\"review_status\": \"in_review\"}'"
echo ""
echo "=== HUMAN ACTION REQUIRED AFTER APPROVAL ==="
echo "Archive purifying-water-with-household-liquid-bleach in the admin UI:"
echo "  http://localhost:3000/review — search for slug 'purifying-water-with-household-liquid-bleach'"
echo "  Set review_status to 'archived' after purify-water-bleach v2 is approved and released."
