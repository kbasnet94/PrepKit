I uploaded a JSON file called shelter_fire_warmth_import_batch.json.

I want you to merge this batch into the existing React Native survival app knowledge system without deleting the current library.

Goal:
Import the new Shelter, Fire, and Warmth batch, normalize it into the existing Guide model, preserve the current library, and apply add/upgrade decisions safely.

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
5. Keep mixed/skill-heavy guides appropriately deprioritized:
   - if contentStatus is needs_source_review, keep them browseable but rank them lower in retrieval
6. Update the guide repository and any seed-data source files so the new batch is included.
7. Update related-guides logic so the new parentTopic structure is reflected.
8. Update the guide detail screen if needed so these fields render cleanly.
9. Do not break the existing Query Tester, Answer Tester, structured answer builder, or AI layer.
10. Preserve the intended upgrade targets where they are the cleanest canonical matches:
    - Basic Outdoor Emergency Shelter Without a Tent -> Shelter Building
    - Recognizing and Responding to Hypothermia -> Hypothermia
    - Basic Outdoor Fire Starting with Matches or Lighters -> Fire Making
11. Keep these stronger guides highly usable in retrieval:
    - Choosing a Safe Spot for Emergency Shelter
    - Simple No-Tools Emergency Shelter Inside Buildings
    - Staying Warm in a Cold Home Without Power
    - Safe Use of Portable Heaters Indoors
    - Safe Options for Heating Indoors During Power Outages
    - Unsafe Indoor Heating Methods to Avoid
    - Recognizing and Responding to Carbon Monoxide Exposure
12. Keep these mixed-source practical guides available but lower ranked unless very relevant:
    - tarp construction / lean-to / A-frame guides
    - fuel selection and wet-weather fire guides
    - moisture-management inside tents and improvised shelters
13. After import, ensure this category is browseable:
    - Shelter, Fire, and Warmth

Success criteria:
- the new guides are merged into the library
- upgrades improve the existing canonical guides without unnecessary duplication
- related sub-guides appear under the right parent topics
- strong indoor warmth and CO safety content is easy to retrieve
- mixed-source bushcraft-style items remain available but not over-promoted
- the app remains fully offline and runnable
