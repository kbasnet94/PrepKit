I uploaded a JSON file called natural_disasters_medical_safety_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Natural Disasters and Medical Safety batch, normalize it into the existing Guide model, preserve the current 57-guide library, and apply add/upgrade decisions safely.

Important rules:
- do not overwrite the entire library blindly
- preserve existing guides unless the JSON explicitly indicates an upgrade_existing action
- use upgrade_existing to improve the current canonical guide
- use add_new to create a new guide
- use add_subguide to create a new related guide under the same parentTopic
- respect contentStatus and sourceQuality
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
9. Do not break the existing Query Tester, Answer Tester, or structured answer system.
10. If a guide is upgraded, preserve compatibility with existing references in the UI/routing where possible.

Requested output:
- summary of imported guides
- which existing guides were upgraded
- which new guides were added
- which guides were marked needs_source_review
- any conflicts or assumptions you had to resolve

Keep the code incremental and compile-safe.
