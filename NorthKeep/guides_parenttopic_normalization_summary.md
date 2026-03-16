# NorthKeep Guide Library — parentTopic Normalization

**Date:** 2026-03-13
**Total guides checked:** 187
**parentTopic values changed:** 17

## What Was Changed

| Slug | Title | Before | After |
|---|---|---|---|
| earthquake-during-shaking | Earthquake Safety: During Shaking | `earthquake-safety-reference` | Earthquakes |
| earthquake-after-shaking | Earthquake Safety: Right After Shaking | `earthquake-safety-reference` | Earthquakes |
| earthquake-tsunami-risk | Earthquake Safety: Tsunami Risk After a Quake | `earthquake-safety-reference` | Earthquakes |
| earthquake-preparedness-checklist | Earthquake Preparedness Checklist | `earthquake-safety-reference` | Earthquakes |
| flood-get-to-higher-ground | Flood Survival: Get to Higher Ground | `flood-survival-reference` | Floods |
| floodwater-safety | Floodwater Safety | `flood-survival-reference` | Floods |
| flood-reentry-cleanup | Returning Home After Flooding | `flood-survival-reference` | Floods |
| tornado-take-shelter | Tornado Safety: Take Shelter Immediately | `tornado-safety-reference` | Tornadoes |
| tornado-vehicle-mobile-home | Tornado Safety: If You Are in a Vehicle or Mobile Home | `tornado-safety-reference` | Tornadoes |
| tornado-after | After the Tornado | `tornado-safety-reference` | Tornadoes |
| wildfire-evacuate-early | Wildfire Evacuation: Leave Early | `wildfire-smoke-evacuation` | Wildfire: Evacuation and Smoke Safety |
| wildfire-smoke-protection | Wildfire Smoke: Protect Your Air | `wildfire-smoke-evacuation` | Wildfire: Evacuation and Smoke Safety |
| wildfire-return-home | Returning After Wildfire | `wildfire-smoke-evacuation` | Wildfire: Evacuation and Smoke Safety |
| minor-cuts-scrapes | Minor Cuts and Scrapes: Clean and Cover | `wound-care-reference` | Bleeding and Wound Care |
| bleeding-control-pressure-first | Bleeding Control: Direct Pressure First | `wound-care-reference` | Bleeding and Wound Care |
| severe-bleeding-get-help-fast | Severe Bleeding: Get Help Fast | `wound-care-reference` | Bleeding and Wound Care |
| wound-needs-urgent-care | When a Wound Needs Urgent Medical Care | `wound-care-reference` | Bleeding and Wound Care |

All five slug-style parentTopic values have been replaced:

| Slug-style (old) | Human-readable (new) |
|---|---|
| `earthquake-safety-reference` | **Earthquakes** |
| `flood-survival-reference` | **Floods** |
| `tornado-safety-reference` | **Tornadoes** |
| `wildfire-smoke-evacuation` | **Wildfire: Evacuation and Smoke Safety** |
| `wound-care-reference` | **Bleeding and Wound Care** |

## Remaining Slug-Style Topics

**None.** All parentTopic values are now human-readable.

## Near-Duplicate Topic Clusters (Advisory Only — Not Changed)

These topic pairs share similar names but represent intentionally distinct groupings. No changes were made; flagged for awareness only:

- Shared prefix `"fire starting"`:
  - Fire Starting Basics (Outdoor)
  - Fire Starting in Wet Conditions (Outdoor)

## Is This Export Safe to Adopt?

**Yes.** Zero slug-style parentTopic values remain. All 187 guides now use consistent human-readable topic names. `guides_master_export.normalized.json` is ready to be the live source of truth.
