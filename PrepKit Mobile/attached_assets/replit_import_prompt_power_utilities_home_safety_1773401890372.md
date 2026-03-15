I uploaded a JSON file called power_utilities_home_safety_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Power, Utilities, and Home Safety batch, normalize it into the existing Guide model, preserve the current library, and apply add/upgrade decisions safely.

Important rules:
- do not overwrite the entire library blindly
- preserve existing guides unless the JSON explicitly indicates an upgrade_existing action
- use upgrade_existing to improve the current canonical guide
- use add_new to create a new guide entry
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
     create a new related guide while preserving the broader guide
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
10. Preserve conservative safety behavior:
    - generator and CO guidance should rank highly for relevant queries
    - utility shutoff guidance should remain cautious and push users toward local utility instructions when appropriate
    - damaged-building and fuel-burning-lighting items marked needs_source_review should stay available but lower ranked
11. Keep the app’s layer badges consistent:
    - action -> Action
    - scenario -> Scenario
    - preparedness -> Preparedness
    - reference -> Reference
12. Respect these intended upgrade targets where they are cleaner than duplication:
    - Deciding What Food to Keep or Throw Away After an Outage -> Deciding When to Throw Away Food After an Outage
    - What to Do if a CO Alarm Sounds -> Recognizing and Responding to Carbon Monoxide Exposure
    - Basics of Shutting Off Gas, Water, and Electricity -> Utility Shutoff and Gas Leak Safety
13. Food-safety overlap:
    - You already have outage food-safety content from the earlier Water, Food, and Sanitation batch
    - For the new outage-food guides, prefer deduping cleanly and preserving the strongest canonical content rather than creating near-identical duplicates
14. After import, ensure this category is browseable:
    - Power, Utilities, and Home Safety

Success criteria:
- the new guides are merged into the library
- upgrades improve the existing canonical guides without losing the originals unnecessarily
- duplicated outage-food content is handled cleanly
- generator and CO safety remain prominent
- the app remains fully offline and runnable
