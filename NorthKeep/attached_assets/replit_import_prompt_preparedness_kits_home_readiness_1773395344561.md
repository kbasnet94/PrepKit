I uploaded a JSON file called preparedness_kits_home_readiness_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Preparedness, Kits, and Home Readiness batch, normalize it into the existing Guide model, preserve the current library, and apply add/upgrade decisions safely.

Important rules:
- do not overwrite the entire library blindly
- preserve existing guides unless the JSON explicitly indicates an upgrade_existing action
- use upgrade_existing to improve the current canonical guide
- use add_new to create a new guide entry
- use add_subguide to create a new related guide while preserving the existing broader guide
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
5. Update the guide repository and any seed-data source files so the new batch is included.
6. Update related-guides logic so the new parentTopic structure is reflected.
7. Update the guide detail screen if needed so these fields render cleanly.
8. Do not break the existing Query Tester, Answer Tester, structured answer builder, or AI layer.
9. Keep the app’s layer badges consistent:
   - action -> Action
   - scenario -> Scenario
   - preparedness -> Preparedness
   - reference -> Reference
10. Make sure these preparedness parent topics are browseable and linked cleanly:
   - 72-Hour Emergency Supplies and Go-Bags
   - Family Emergency and Communication Planning
   - Shelter-in-Place Kits and Procedures
   - Medical Needs, Medicines, and Document Backup
   - Pet Emergency Preparation
   - Home Readiness Basics and Safety Checks
11. Preserve the “short card first, expandable detail second” presentation approach for this batch wherever the UI supports it.

Success criteria:
- the new preparedness guides are merged into the library
- they render cleanly in browse, detail, related-guides, and retrieval logic
- they remain fully offline and local
- the app stays runnable
