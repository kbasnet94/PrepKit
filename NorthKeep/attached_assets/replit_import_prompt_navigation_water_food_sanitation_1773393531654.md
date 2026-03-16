I uploaded a JSON file called navigation_water_food_sanitation_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Navigation, Rescue, and Signaling plus Water, Food, and Sanitation batch, normalize it into the existing Guide model, preserve the current library, and apply add/upgrade decisions safely.

Important rules:
- do not overwrite the entire library blindly
- preserve existing guides unless the JSON explicitly indicates an upgrade_existing action
- use upgrade_existing to improve the current canonical guide
- use add_new to create a new guide
- use add_subguide to create a new related guide under the same parentTopic
- respect contentStatus, sourceQuality, and the current layer badge system
- keep the app runnable at every step
- keep everything offline/local

Tasks:

1. Read and import the JSON batch.
2. Map each guide into the app’s current Guide type.
3. For integrationAction:
   - upgrade_existing:
     update the matching existing guide, preserving stable IDs/slugs if that is the better app behavior
   - add_new:
     create a new guide entry
   - add_subguide:
     create a new related guide while preserving the existing broader guide
4. Preserve and use these fields:
   - title
   - slug
   - guideType
   - layer
   - category
   - parentTopic
   - sourceQuality
   - contentStatus
   - quickAnswer
   - whenToUse
   - preferredAction
   - backupAction
   - steps
   - warnings
   - whatNotToDo
   - redFlags
   - preparednessTips
   - sourceReferences
   - appTags
5. Keep weaker-source guides deprioritized:
   - if contentStatus is needs_source_review, keep them browseable but rank them lower in retrieval
6. Update the guide repository and any seed-data source files so the new batch is included.
7. Update related-guides logic so the new parentTopic structure is reflected.
8. Update the guide detail screen if needed so these fields render cleanly.
9. Do not break the existing Query Tester, Answer Tester, structured answer builder, or AI layer.
10. Preserve land-first logic in this batch:
    - land navigation and signaling should remain the default in retrieval
    - maritime guides should stay available but clearly grouped as a secondary module under the same category
11. Keep the app’s layer badges consistent:
    - action -> Action
    - scenario -> Scenario
    - reference -> Reference
12. If the app uses title or slug matching for upgrades, use these intended upgrade targets:
    - Basic Navigation Without GPS (Land) -> Land Navigation
    - Purifying Water by Boiling -> Water Purification
    - Refrigerator Safety During Outages / Freezer Safety During Outages / Deciding When to Throw Away Food After an Outage -> keep Food Preservation as the broader parent and add these as sub-guides unless a direct upgrade is cleaner
13. After import, ensure these two categories are browseable:
    - Navigation, Rescue, and Signaling
    - Water, Food, and Sanitation

Success criteria:
- the new guides are merged into the library
- upgrades improve the existing canonical guides without losing the originals unnecessarily
- related sub-guides appear under the right parent topics
- land-first rescue logic remains clear
- purification, food safety, and sanitation topics are clearly separated
- the app remains fully offline and runnable
