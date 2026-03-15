#!/bin/bash
# Run this from your Mac to execute the Import/Staging step.
# Prerequisites: admin app running at localhost:3000
# Usage: cd ~/Desktop/PrepKit/pipeline-dry-run && bash run-import.sh

GUIDE_FILE="$(dirname "$0")/guide-annotated.json"

echo "=== Step 1: Preview ==="
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
  -d "{\"guide\": $(cat "$GUIDE_FILE"), \"changeSummary\": \"Upgraded from 4 to 9 step-by-step actions, expanded warnings from 1 to 4, expanded redFlags from 1 to 5, added post-impact steps, replaced placeholder content, added 3 authoritative source references with URLs from USGS and FEMA/Ready.gov.\"}")

echo "$SAVE" | python3 -m json.tool
echo ""
echo "=== Import complete. Guide is now in the Review Queue at draft status. ==="
echo "Review at: http://localhost:3000/review?filter=draft"
