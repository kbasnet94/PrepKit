I uploaded a JSON file called core_skills_basic_survival_tasks_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Core Skills and Basic Survival Tasks batch, normalize it into the existing Guide model, preserve the current library, and apply add/upgrade decisions safely.

Important rules:
- do not overwrite the entire library blindly
- preserve existing guides unless the JSON explicitly indicates an upgrade_existing action
- use upgrade_existing to improve the current canonical guide
- use add_new to create a new guide entry
- use add_subguide to create a new related guide under the same parentTopic or closely related canonical guide
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
    - planning, first-30-minutes, signaling, and practical kit content should rank higher than judgment-heavy skill content
    - last-resort untreated-water guidance must stay clearly marked as last resort and lower-ranked
    - knot guidance must stay explicitly non-technical and never be used for life-safety loads
    - knife guidance must stay focused on small controlled tasks and safety, not advanced or tactical use
11. Keep the app’s layer badges consistent:
    - action -> Action
    - scenario -> Scenario
    - preparedness -> Preparedness
    - reference -> Reference
12. Respect these intended upgrade targets where they are cleaner than duplication:
    - Decide: Stay Put or Move Carefully -> Stay Put vs Move (Land)
    - Whistle and Sound Signals (Three-Blast Distress) -> Whistle Distress Signals (Land)
    - Using a Signal Mirror and Light -> Mirror and Light Signaling (Land, Day and Night)
    - Tying Down Tarps and Shelters (Taut-Line and Truckers’ Hitch) -> Knot Tying
    - Grab-and-Go Bag Basics (Home/Urban) -> Personal Evacuation Go-Bag (Adult)
13. Preserve category browseability after import:
    - Core Skills and Basic Survival Tasks
14. Keep high-skill overlap clean:
    - avoid creating confusing duplication with Navigation, Shelter, Water, and Preparedness guides where a clean subguide or upgrade is better
    - preserve conservative public-safety tone over bushcraft style presentation

Success criteria:
- the new guides are merged into the library
- upgrades improve the existing canonical guides without unnecessary duplication
- planning and signaling content becomes more complete and useful
- lower-confidence knot, knife, and untreated-water items stay available but lower-ranked
- the app remains fully offline and runnable
