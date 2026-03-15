#!/bin/bash
# Stage the purify-water-boiling upgrade into the admin Review Queue.
# Prerequisites: admin app running at localhost:3000
# Usage: cd ~/Desktop/PrepKit/pipeline-dry-run-water && bash run-import.sh

GUIDE_FILE="$(dirname "$0")/guide-annotated.json"
CHANGE_SUMMARY="Upgraded purify-water-boiling: expanded from 5 to 7 steps with explicit rolling-boil definition, container guidance, and 24-hour storage limit; corrected altitude threshold from 2,000m to 5,000ft (1,500m) per EPA/FEMA consensus; warnings expanded from 2 to 4 including chemical-concentration risk; redFlags expanded from 2 to 5; replaced 3 source references with real URLs from EPA and CDC; added first-ever constraint metadata (responseRole=primary, blockedByConstraints=[no_boiling,no_fire,no_heat_source]) to enable fallback chain routing to bleach guide."

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
