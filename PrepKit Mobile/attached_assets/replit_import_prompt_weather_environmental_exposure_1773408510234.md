I uploaded a JSON file called weather_environmental_exposure_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Weather and Environmental Exposure batch, normalize it into the existing Guide model, preserve the current library, and apply add/upgrade decisions safely.

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
    - heat and smoke emergency content should rank highly for relevant queries
    - lightning, cold, and altitude content with weaker sourcing should remain available but rank lower where marked reviewed or needs_source_review
    - altitude content should not outrank stronger core emergency guidance until stronger primary sources are added
11. Keep the app’s layer badges consistent:
    - action -> Action
    - scenario -> Scenario
    - preparedness -> Preparedness
    - reference -> Reference
12. Respect these intended upgrade targets where they are cleaner than duplication:
    - Recognizing and Treating Heat Exhaustion -> Heat Exhaustion: On-the-Spot Care
    - Recognizing and Responding to Heat Stroke (Medical Emergency) -> Heat Stroke: Suspected Life-Threatening Emergency
    - Protecting Yourself from Wildfire Smoke Indoors -> During Wildfire Smoke
    - Field Response to Mild Hypothermia -> Recognizing and Responding to Hypothermia
    - Field Response to Frostbite -> Frostbite: Local Cold Injury Care
13. After import, ensure this category is browseable:
    - Weather and Environmental Exposure

Success criteria:
- the new guides are merged into the library
- upgrades improve existing canonical guides without unnecessary duplication
- strong heat, air-quality, smoke, and red-flag content is prominent
- weaker-source lightning and altitude content remains available but lower ranked
- the app remains fully offline and runnable
