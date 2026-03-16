export interface ActionCard {
  id: string;
  title: string;
  summary: string;
  whenToUse: string;
  prerequisites: string[];
  bestOption: string;
  backupOption: string;
  steps: string[];
  warnings: string[];
  tags: string[];
  keywords: string[];
  sourceGuideIds: string[];
  category: string;
  iconName: string;
  riskLevel: "low" | "medium" | "high";
}

export const ACTION_CARDS: ActionCard[] = [
  {
    id: "fire-no-matches",
    title: "Start a Fire Without Matches",
    summary: "Methods for igniting fire using primitive and improvised techniques.",
    whenToUse: "When you need warmth, light, water purification, or signaling and have no lighter or matches.",
    prerequisites: ["Dry tinder material", "Small dry sticks for kindling", "Larger fuel wood"],
    bestOption: "Ferro rod / fire steel — generates sparks at 3,000°F, works wet, extremely reliable.",
    backupOption: "Bow drill friction fire — slow but uses only natural materials. Requires dry softwood for fireboard and spindle.",
    steps: [
      "Gather tinder: dry grass, bark shavings, cattail fluff, or bird nests. Shape into a small bird-nest bundle.",
      "Build a teepee of small dry sticks (pencil-width) over the tinder bundle.",
      "Ferro rod: hold the rod close to tinder, scrape firmly with your knife spine or striker.",
      "Bow drill: carve a flat fireboard with a notch, press a dry spindle into the notch, use a bow to spin rapidly until you have an ember.",
      "Transfer the ember into your tinder bundle, fold gently, and blow softly until it ignites.",
      "Gradually add larger kindling, then fuel wood as the fire grows.",
    ],
    warnings: [
      "Wet materials will not ignite. Dry your tinder against your body first.",
      "Fire needs oxygen — don't smother it by adding too much fuel too fast.",
      "Clear a 3-foot perimeter of dry leaves before lighting. Never leave fire unattended.",
      "Bow drill requires practice. Learn it at home before you need it in the field.",
    ],
    tags: ["fire", "emergency", "primitive", "friction", "ferro-rod"],
    keywords: ["fire", "flame", "ignite", "light", "matches", "lighter", "bow drill", "friction", "ferro", "flint", "spark", "tinder", "kindling", "warmth"],
    sourceGuideIds: ["fire-making"],
    category: "Core Skills",
    iconName: "flame-outline",
    riskLevel: "medium",
  },
  {
    id: "tinder-bundle",
    title: "Build a Tinder Bundle",
    summary: "How to prepare dry, combustible tinder that catches a spark and holds an ember.",
    whenToUse: "Before attempting any fire-starting — the tinder bundle is the single most critical element.",
    prerequisites: ["Dry plant material", "Time and patience"],
    bestOption: "Bird-nest shaped bundle of dry grass, shredded bark, or cattail fluff — holds an ember and allows airflow.",
    backupOption: "Pocket lint, dry moss, or finely shredded dry leaves if natural materials are scarce.",
    steps: [
      "Find the driest material available: dry grass, shredded cedar or birch bark, cattail seed heads, dried fungi.",
      "Shred or rub the material between your palms until it is fine and fibrous.",
      "Shape it into a loose bird-nest shape — a hollow center for the ember, surrounded by finer material.",
      "Test dryness: material should crumble at a touch. If damp, dry it in your hands or inside your clothing against your body.",
      "Place the ember into the hollow center of the bundle, fold the sides up around it.",
      "Blow gently and steadily from underneath until flames appear.",
    ],
    warnings: [
      "Green or damp tinder is the #1 reason fire-starting fails. Dry your material first.",
      "Make your tinder bundle larger than you think you need — it burns fast.",
      "Protect your tinder from wind and ground moisture while you prepare other fire materials.",
    ],
    tags: ["fire", "tinder", "ember", "primitive"],
    keywords: ["tinder", "tinder bundle", "fire bundle", "ember", "kindling", "dry grass", "bark", "cattail", "nest"],
    sourceGuideIds: ["fire-making"],
    category: "Core Skills",
    iconName: "flame-outline",
    riskLevel: "low",
  },
  {
    id: "water-purification",
    title: "Purify Water for Drinking",
    summary: "Safe methods to treat potentially contaminated water in the field.",
    whenToUse: "Whenever you need to drink water from a natural source, unknown supply, or compromised tap.",
    prerequisites: ["Container to boil or hold water", "Heat source (for boiling)"],
    bestOption: "Boiling — kills all pathogens including viruses. Bring to a rolling boil for 1 minute (3 minutes above 6,500 ft / 2,000 m).",
    backupOption: "Chemical treatment — 2 drops of unscented household bleach (5–8% chlorine) per liter of clear water. Wait 30 minutes. Double the dose for cloudy water.",
    steps: [
      "Filter visibly dirty water through cloth, clothing, or a bandana to remove sediment first.",
      "Boiling method: fill container, bring to a full rolling boil, let cool before drinking.",
      "Bleach method: add 2 drops unscented bleach per liter, stir, wait 30 min. Water should smell faintly of chlorine.",
      "Iodine tablets: follow package directions, typically 1 tablet per liter, wait 30 minutes.",
      "Solar disinfection (SODIS): fill a clear plastic bottle, lay in full sun for 6 hours (2 days if cloudy).",
    ],
    warnings: [
      "Never drink untreated water from streams, rivers, ponds, or standing water.",
      "Boiling does NOT remove chemical contaminants, heavy metals, or salt.",
      "Bleach loses effectiveness over time — use only fresh unscented household bleach.",
      "Dehydration kills faster than most waterborne illness. If you must choose, drink filtered water rather than none at all.",
    ],
    tags: ["water", "emergency", "hydration", "purification", "boiling"],
    keywords: ["water", "drink", "hydrate", "purify", "boil", "filter", "contaminated", "stream", "river", "pond", "bleach", "iodine", "safe", "clean"],
    sourceGuideIds: ["water-purification", "solar-still"],
    category: "Core Skills",
    iconName: "water-outline",
    riskLevel: "medium",
  },
  {
    id: "emergency-shelter",
    title: "Build an Emergency Shelter",
    summary: "Rapid shelter construction to protect from wind, rain, and cold.",
    whenToUse: "When you need protection from the elements and cannot reach a building. Always build before dark.",
    prerequisites: ["A ridgepole (long branch)", "Sticks for ribbing", "Leaves/debris/bark for cover"],
    bestOption: "Debris hut — uses only natural materials, excellent insulation. Works even without a tarp.",
    backupOption: "Tarp lean-to — fast to set up with a tarp and cordage. Good wind and rain protection.",
    steps: [
      "Find a dry, elevated spot away from flood risk and dead standing trees.",
      "Debris hut: prop a long ridgepole (10+ ft) at a 45-degree angle against a tree or forked branch.",
      "Lean sticks along both sides of the ridgepole to form a ribbed frame.",
      "Pile leaves, bark, pine needles, or debris over the frame at least 2–3 feet thick.",
      "Fill the inside with dry leaves for insulation. The shelter should fit your body closely to retain heat.",
      "Tarp lean-to: tie cordage between two trees at chest height, drape tarp over it, stake down the front edge at a 45-degree angle.",
    ],
    warnings: [
      "Insulate from the ground — ground cold steals heat faster than cold air. Use leaves, branches, or a sleeping pad.",
      "Make the shelter smaller than you think — body heat can only warm a small space.",
      "Avoid building near water sources at night — fog, moisture, and animals.",
      "Check for widow-makers (dead branches overhead) before settling in.",
    ],
    tags: ["shelter", "emergency", "debris-hut", "tarp", "warmth"],
    keywords: ["shelter", "tarp", "debris", "hut", "lean-to", "tent", "protect", "rain", "wind", "cold", "build", "cover", "warmth", "overnight", "sleep"],
    sourceGuideIds: ["shelter-building"],
    category: "Core Skills",
    iconName: "home-outline",
    riskLevel: "low",
  },
  {
    id: "signal-rescue",
    title: "Signal for Rescue",
    summary: "How to make yourself visible and audible to rescuers.",
    whenToUse: "When you are lost, stranded, or injured and need rescuers to find you.",
    prerequisites: ["Any shiny material, whistle, bright fabric, or fire materials"],
    bestOption: "Signal mirror — can be seen from 10+ miles on a clear day. Use any shiny surface (phone screen, foil, CD).",
    backupOption: "Three fires in a triangle, 100 feet apart — universal distress signal recognizable from aircraft.",
    steps: [
      "Stay in place if you are reported missing — searchers will start from your last known position.",
      "Three of anything = distress: 3 whistle blasts, 3 fires, 3 gunshots, 3 flashes.",
      "Mirror signal: hold mirror with both hands, reflect sunlight onto your hand, angle to sweep toward aircraft.",
      "Ground-to-air signals: stomp large symbols in a clearing — X = need help, V = need medical help, → = going this direction.",
      "Bright color: hang bright clothing or gear in a visible location above the tree line.",
      "Fire and smoke: build fire on a ridge or clearing. Add green vegetation for white smoke, rubber/plastic for black smoke.",
    ],
    warnings: [
      "Don't waste energy trying to move unless you are certain of your direction. Rescuers expect you to stay put.",
      "Mirror signaling at the wrong angle is wasted effort — practice sweeping across the target.",
      "Maintain any signal fires consistently. Rescuers may pass at any hour.",
    ],
    tags: ["signal", "rescue", "emergency", "sos", "visibility"],
    keywords: ["signal", "rescue", "help", "sos", "found", "mirror", "fire", "smoke", "whistle", "aircraft", "helicopter", "visible", "search", "lost"],
    sourceGuideIds: ["signaling", "morse-code", "fire-making"],
    category: "Communication",
    iconName: "radio-outline",
    riskLevel: "low",
  },
  {
    id: "navigation-no-gps",
    title: "Navigate Without GPS",
    summary: "Primitive and improvised navigation techniques using the sun, stars, and environment.",
    whenToUse: "When you have no GPS, compass, or phone signal and need to determine direction.",
    prerequisites: ["Clear sky (for sun/stars) or environmental observation"],
    bestOption: "Shadow stick method — works in any daylight, only requires a stick and two rocks.",
    backupOption: "Night navigation using Polaris (North Star) — accurate to within 1 degree of true north.",
    steps: [
      "Shadow stick: push a straight stick vertically into the ground. Mark the tip of the shadow with a rock. Wait 15 minutes. Mark the new shadow tip. The line from first to second mark points roughly east-west. First mark = west.",
      "Sun position: in the Northern Hemisphere, the sun rises in the east, is south at noon, sets in the west.",
      "Polaris (Northern Hemisphere): find the Big Dipper. Follow the two stars at the end of its 'cup' — they point directly to Polaris (North Star). It's always north.",
      "Watch method: hold an analog watch horizontal. Point the 12 at the sun. The midpoint between 12 and the hour hand points south.",
      "Environmental clues: moss often grows on the north side of trees in the Northern Hemisphere. Snow melts faster on south-facing slopes.",
    ],
    warnings: [
      "Environmental navigation clues are unreliable alone — use multiple methods.",
      "In the Southern Hemisphere, the sun passes north at noon, and the Southern Cross points south.",
      "If truly lost, follow a river or stream downhill — it leads to civilization in most regions.",
    ],
    tags: ["navigation", "direction", "compass", "stars", "sun"],
    keywords: ["navigate", "navigation", "lost", "direction", "north", "south", "gps", "compass", "star", "polaris", "sun", "shadow", "map", "find way", "which way"],
    sourceGuideIds: ["navigation"],
    category: "Navigation",
    iconName: "compass-outline",
    riskLevel: "low",
  },
  {
    id: "stop-bleeding",
    title: "Stop Severe Bleeding",
    summary: "Immediate steps to control life-threatening hemorrhage.",
    whenToUse: "When a wound is bleeding heavily, especially if blood is spurting or soaking through bandages quickly.",
    prerequisites: ["Clean cloth, bandages, or improvised dressings"],
    bestOption: "Direct pressure with improvised tourniquet for limb wounds — can be life-saving in under 3 minutes.",
    backupOption: "Wound packing with direct pressure for wounds that can't be tourniqueted (torso, neck, groin).",
    steps: [
      "Apply firm direct pressure immediately with the cleanest material available. Press hard and don't release to check.",
      "If blood soaks through, add more material on top — do NOT remove the first layer.",
      "For arm or leg wounds: apply a tourniquet 2–3 inches above the wound, tighten until bleeding stops. Note the time applied.",
      "Wound packing (torso/groin): push gauze or cloth firmly into the wound cavity with your fingers, then apply hard pressure.",
      "Elevate the injured limb above the heart if possible.",
      "Keep the patient warm and calm. Lay them down to prevent fainting. Treat for shock.",
    ],
    warnings: [
      "Do NOT remove a tourniquet once applied in the field — this should be done by medical personnel.",
      "Tourniquets cause tissue damage over time. Use only for life-threatening limb bleeding.",
      "Shock is a killer: lay patient flat, elevate legs 12 inches, keep warm, don't give food or water.",
      "Head and neck wounds: use pressure only, never a tourniquet.",
      "Seek professional medical care as soon as possible.",
    ],
    tags: ["first-aid", "bleeding", "emergency", "wound", "tourniquet"],
    keywords: ["bleed", "wound", "cut", "injury", "blood", "tourniquet", "pressure", "hemorrhage", "laceration", "bandage", "first aid", "medical", "stop bleeding", "severe"],
    sourceGuideIds: ["first-aid", "wound-care"],
    category: "Medical",
    iconName: "bandage-outline",
    riskLevel: "high",
  },
  {
    id: "clean-wound",
    title: "Clean and Protect a Cut",
    summary: "Infection prevention and wound management for minor to moderate injuries.",
    whenToUse: "Any time skin is broken. Do not use this guide for severe or arterial bleeding — see Stop Severe Bleeding.",
    prerequisites: ["Clean water, cloth for dressing"],
    bestOption: "Irrigation with clean water under pressure — the most effective way to remove bacteria and debris from a wound.",
    backupOption: "Honey (raw) — natural antimicrobial. Apply directly to wound and cover. Used for centuries.",
    steps: [
      "Control bleeding first — apply direct pressure until bleeding stops.",
      "Irrigate thoroughly: flush the wound with clean water using a syringe, plastic bag with a small hole, or your water bottle. High pressure is more effective than gentle rinsing.",
      "Remove visible debris with clean tweezers or fingers. Don't probe deeply.",
      "Do NOT close deep wounds in the field — leave open for drainage to prevent infection from sealing in.",
      "Cover with the cleanest material available. Change dressing daily.",
      "Watch for infection signs: increasing redness, swelling, warmth, pus, red streaking, or fever. Get medical help urgently.",
    ],
    warnings: [
      "Do not use alcohol or hydrogen peroxide inside a wound — damages tissue and slows healing.",
      "Puncture wounds are high infection risk. Irrigate deeply.",
      "Animal bites require professional treatment for rabies risk whenever possible.",
      "Red streaking from a wound toward the body means spreading infection — a medical emergency.",
      "This guide covers basic wound care only. Seek medical attention as soon as possible.",
    ],
    tags: ["wound", "infection", "first-aid", "medical", "hygiene"],
    keywords: ["wound", "cut", "scratch", "infect", "clean", "dress", "bandage", "antiseptic", "heal", "laceration", "bite", "puncture", "gash"],
    sourceGuideIds: ["wound-care", "first-aid"],
    category: "Medical",
    iconName: "medkit-outline",
    riskLevel: "high",
  },
  {
    id: "perform-cpr",
    title: "Perform CPR",
    summary: "Life-saving chest compressions and rescue breaths for cardiac or respiratory arrest.",
    whenToUse: "When a person is unresponsive and not breathing normally. Call emergency services immediately if possible.",
    prerequisites: ["Clear, firm surface to lay person on"],
    bestOption: "Hands-only CPR (chest compressions only) — recommended for untrained bystanders and still highly effective.",
    backupOption: "Full CPR with rescue breaths — for trained responders. 30 compressions : 2 breaths ratio.",
    steps: [
      "CHECK: Tap the person's shoulders firmly. Shout 'Are you OK?' If no response, call 911 (or have someone else call).",
      "POSITION: Lay person flat on their back on a firm surface. Kneel beside them.",
      "COMPRESS: Place heel of one hand on center of chest (lower half of breastbone). Place other hand on top, interlace fingers.",
      "Push hard and fast: compress at least 2 inches (5 cm) deep at 100–120 compressions per minute. Allow full chest recoil between compressions.",
      "RESCUE BREATHS (if trained): After 30 compressions, tilt head back, lift chin, pinch nose, give 2 slow breaths (1 second each, enough to see chest rise).",
      "Continue CPR until the person starts breathing, professional help arrives, an AED is available, or you are physically unable to continue.",
    ],
    warnings: [
      "Effective CPR requires force — rib cracking is possible and preferable to death. Do not hold back.",
      "Hands-only CPR (no rescue breaths) is nearly as effective for adults and safer for untrained rescuers.",
      "Do not perform CPR on a person who is breathing normally.",
      "This guide provides basic guidance only. Formal CPR training is strongly recommended.",
      "Always call emergency services first or have someone else call while you begin CPR.",
    ],
    tags: ["cpr", "cardiac-arrest", "emergency", "medical", "life-saving"],
    keywords: ["cpr", "cardiac arrest", "heart attack", "not breathing", "unconscious", "resuscitation", "chest compressions", "rescue breaths", "pulse", "heartbeat"],
    sourceGuideIds: ["cpr", "first-aid"],
    category: "Medical",
    iconName: "heart-outline",
    riskLevel: "high",
  },
  {
    id: "hypothermia-prevention",
    title: "Stay Warm in Cold Conditions",
    summary: "Recognizing and responding to dangerous body temperature drops.",
    whenToUse: "When someone is cold, confused, shivering severely, or has been wet and exposed to wind.",
    prerequisites: ["Dry clothing or insulation, shelter, heat source if possible"],
    bestOption: "Get out of wet clothing immediately. Insulate from the ground. Add external heat source (fire, body heat, warm water bottles).",
    backupOption: "If no dry clothing: wring out wet clothes, put back on, add insulation layers on top, and get to shelter immediately.",
    steps: [
      "Recognize signs: uncontrolled shivering, slurred speech, confusion, loss of coordination, blue lips.",
      "Remove wet clothing — wet fabric conducts heat away 25x faster than dry. Even damp is dangerous.",
      "Get to shelter and off the ground. Ground absorbs body heat rapidly.",
      "Insulate: wrap in sleeping bag, blankets, or dry leaves. Cover the head — significant heat is lost there.",
      "Rewarm slowly: warm (not hot) water bottles to armpits, groin, and neck. Body-to-body heat works well.",
      "Give warm (not hot) sweet drinks if the person is conscious and can swallow.",
    ],
    warnings: [
      "A person may stop shivering as hypothermia worsens — this is a dangerous sign, not improvement.",
      "Never give alcohol — it dilates blood vessels and increases heat loss.",
      "Do not apply direct heat (heating pad, hot water) to skin — causes burns and cardiac complications.",
      "Hypothermia can occur in temperatures above freezing if wet and windy.",
      "Severe hypothermia: handle gently — rough movement can cause cardiac arrest.",
    ],
    tags: ["hypothermia", "cold", "temperature", "emergency", "medical"],
    keywords: ["cold", "hypothermia", "shiver", "freezing", "temperature", "exposure", "wet", "warm up", "heat loss", "frostbite", "rewarming", "body heat"],
    sourceGuideIds: ["hypothermia", "shelter-building"],
    category: "Medical",
    iconName: "snow-outline",
    riskLevel: "high",
  },
  {
    id: "recognize-dehydration",
    title: "Recognize and Treat Dehydration",
    summary: "Identifying dehydration symptoms and rehydrating safely in the field.",
    whenToUse: "When you or someone shows signs of dehydration — especially in hot weather, after illness, or when water has been scarce.",
    prerequisites: ["Water supply (treated/clean)", "Electrolyte source if available"],
    bestOption: "Oral rehydration — sip clean water consistently. Don't drink too fast — it may cause vomiting.",
    backupOption: "Improvised oral rehydration solution: 1 liter clean water + 6 teaspoons sugar + 1/2 teaspoon salt. Stir and sip slowly.",
    steps: [
      "Recognize mild dehydration: thirst, dark yellow urine, dry mouth, fatigue, dizziness.",
      "Recognize severe dehydration: no urination for 8+ hours, very dark or no urine, extreme fatigue, confusion, rapid heartbeat, sunken eyes.",
      "Move to shade and stop physical activity immediately.",
      "Drink water in small, steady sips — 250ml every 15 minutes. Avoid large gulps.",
      "If available, use oral rehydration salts (ORS) or sports drink. If not, add a small pinch of salt and sugar to water.",
      "Rest and monitor. Urine should become lighter and more frequent within 1–2 hours.",
    ],
    warnings: [
      "Severe dehydration (confusion, very dark urine, fainting) is a medical emergency — seek professional help.",
      "Do NOT give large amounts of plain water rapidly to a severely dehydrated person — it can cause electrolyte imbalance.",
      "Children and elderly are at much higher risk of rapid deterioration.",
      "Dehydration combined with heat exhaustion is life-threatening. Rest in shade, cool the person down.",
    ],
    tags: ["dehydration", "water", "medical", "hydration", "electrolytes"],
    keywords: ["dehydration", "thirsty", "dry mouth", "dark urine", "electrolytes", "rehydrate", "water loss", "dizziness", "heat", "fatigue", "oral rehydration"],
    sourceGuideIds: ["dehydration", "water-purification"],
    category: "Medical",
    iconName: "water-outline",
    riskLevel: "high",
  },
  {
    id: "prepare-earthquake",
    title: "Prepare for Earthquakes",
    summary: "What to do before, during, and immediately after an earthquake.",
    whenToUse: "Before: general preparedness in earthquake-prone areas. During and after an earthquake.",
    prerequisites: [],
    bestOption: "Drop, Cover, and Hold On — the universally recommended response during shaking.",
    backupOption: "If no table or desk nearby: crouch against an interior wall away from windows, protecting your head and neck with your arms.",
    steps: [
      "BEFORE: Secure heavy furniture and appliances to walls. Know where to find gas, water, and electricity shutoffs.",
      "BEFORE: Keep a go-bag ready: water (1 gallon/person/day for 3 days), food, first aid kit, flashlight, phone charger.",
      "DURING: Drop to hands and knees. Take cover under a sturdy table or desk. Hold On and stay until shaking stops.",
      "DURING: Stay away from windows, exterior walls, and anything that could fall.",
      "AFTER: Check for injuries. Do not move seriously injured people unless they are in immediate danger.",
      "AFTER: Check for gas leaks (smell), structural damage, and fire. If gas is suspected, leave the building and do not use open flames.",
      "AFTER: Expect aftershocks. Stay out of damaged buildings.",
    ],
    warnings: [
      "The 'triangle of life' method (cowering beside furniture) is NOT recommended by emergency management agencies. Drop, Cover, Hold On is correct.",
      "Do not run outside during shaking — most injuries happen from falling debris as people try to move.",
      "After a major earthquake, do not use elevators.",
      "Check on neighbors, especially elderly or disabled people.",
    ],
    tags: ["earthquake", "disaster", "preparedness", "emergency"],
    keywords: ["earthquake", "quake", "tremor", "seismic", "aftershock", "drop cover hold", "shelter in place", "structural damage", "preparedness"],
    sourceGuideIds: ["earthquake"],
    category: "Natural Disasters",
    iconName: "pulse-outline",
    riskLevel: "high",
  },
  {
    id: "prepare-flood",
    title: "Prepare for Flood Conditions",
    summary: "Actions to take before, during, and after flooding.",
    whenToUse: "When flooding is forecast, already occurring, or when living in a flood-prone area.",
    prerequisites: [],
    bestOption: "Evacuate early when authorities issue warnings — never wait to see how bad it gets.",
    backupOption: "If unable to evacuate: move to the highest floor of a sturdy building and wait for rescue.",
    steps: [
      "BEFORE: Know your flood zone. Sign up for local emergency alerts.",
      "BEFORE: Move valuables, documents, and electrical appliances to upper floors.",
      "BEFORE: Keep a go-bag ready with 72 hours of supplies. Have a family evacuation plan.",
      "DURING: If ordered to evacuate, go immediately. Do not drive through flooded roads — 6 inches of water can knock a person down, 12 inches can sweep a small vehicle away.",
      "DURING: If trapped in a building, move to the roof only if water is rising inside. Signal for rescue.",
      "DURING: If swept into water, float on your back with feet downstream to fend off obstacles.",
      "AFTER: Do not return home until authorities say it is safe. Floodwater is contaminated — avoid contact.",
    ],
    warnings: [
      "Turn Around, Don't Drown: more than half of flood fatalities involve vehicles. Never drive through flooded roads.",
      "Floodwater is contaminated with sewage, chemicals, and debris. Avoid skin contact. Disinfect anything it touched.",
      "Do not use tap water after flooding until local authorities confirm it is safe.",
      "Be aware of downed power lines near water.",
    ],
    tags: ["flood", "disaster", "preparedness", "evacuation"],
    keywords: ["flood", "flooding", "flash flood", "water rising", "evacuate", "flood zone", "floodwater", "storm surge", "levee"],
    sourceGuideIds: ["flood"],
    category: "Natural Disasters",
    iconName: "rainy-outline",
    riskLevel: "high",
  },
  {
    id: "find-water-wild",
    title: "Find Water in the Wild",
    summary: "Methods for locating natural water sources when none are obvious.",
    whenToUse: "When you have no water supply and need to locate a source in the wilderness.",
    prerequisites: ["Observation, energy to move and explore"],
    bestOption: "Follow terrain downhill — water collects in valleys, ravines, and low ground. Listen for the sound of running water.",
    backupOption: "Morning dew collection — wipe dew from grass and leaves with an absorbent cloth before sunrise, then wring out.",
    steps: [
      "Follow terrain: move downhill. Water flows to the lowest points. Look for valleys, ravines, and dry creek beds.",
      "Watch for vegetation: willows, cottonwoods, cattails, and bright green patches indicate moisture below.",
      "Animal trails often lead to water, especially in dry climates. Follow trails that converge downhill.",
      "Dew collection: use a cloth to wipe grass and leaves early morning before the sun burns it off.",
      "Dig in dry creek beds: dig 1–2 feet in the outside bend of a dry riverbed — water may be just below the surface.",
      "Collect rain and morning condensation by spreading a tarp, poncho, or large leaves in a bowl shape.",
    ],
    warnings: [
      "Always purify any found water before drinking — see Purify Water for Drinking.",
      "Dehydration impairs judgment. Prioritize finding water above almost everything else.",
      "Avoid water near industrial areas, mines, or strange-colored soil — chemical contamination.",
    ],
    tags: ["water", "hydration", "survival", "wilderness", "find"],
    keywords: ["find water", "water source", "stream", "river", "dehydrated", "thirsty", "no water", "locate water", "dew", "spring", "well", "dry"],
    sourceGuideIds: ["water-purification", "solar-still", "dehydration"],
    category: "Core Skills",
    iconName: "water-outline",
    riskLevel: "low",
  },
  {
    id: "food-foraging-basics",
    title: "Find Food in the Wild",
    summary: "Safe foraging and food sourcing strategies in survival situations.",
    whenToUse: "When stranded for multiple days with no food supply.",
    prerequisites: ["Basic plant/insect identification knowledge. When in doubt, use the Universal Edibility Test."],
    bestOption: "Insects and grubs — highest protein-to-effort ratio. Most are edible when cooked. Look under logs and bark.",
    backupOption: "Fishing with improvised tackle — hooks from safety pins, thorns, or bone; line from shoelaces or paracord.",
    steps: [
      "Remember: you can survive 3 weeks without food but only 3 days without water. Prioritize water first.",
      "Insects: look under logs, rocks, and bark. Grubs, ants, earthworms, and crickets are high in protein. Cook before eating.",
      "Plants: stick to ones you can positively identify. Dandelions, clover, pine needles (Vitamin C), and cattail roots are widely recognizable.",
      "Universal Edibility Test for unknown plants: test small amounts on skin, lips, mouth over 8+ hours before swallowing.",
      "Fishing: fashion hooks from safety pins, thorns, or carved bone. Tie to any thin line. Bait with insects or worms.",
      "Trapping: simple figure-4 deadfall trap for small animals. Place on active animal trails with fresh bait.",
    ],
    warnings: [
      "Never eat mushrooms in a survival situation unless you are an expert — many are deadly and look edible.",
      "Avoid brightly colored berries, milky or colored plant sap, bitter-tasting plants, and plants with shiny leaves.",
      "Cooking kills most pathogens in insects and small animals.",
    ],
    tags: ["food", "foraging", "survival", "hunting", "insects"],
    keywords: ["food", "eat", "hungry", "starving", "forage", "plants", "insects", "fish", "hunt", "trap", "survive without food", "edible", "berries", "mushrooms"],
    sourceGuideIds: ["foraging", "fishing", "trapping", "food-preservation"],
    category: "Food",
    iconName: "leaf-outline",
    riskLevel: "medium",
  },
  {
    id: "knots-essential",
    title: "Use Basic Knots for Shelter and Rigging",
    summary: "The most useful knots for shelter, rescue, and rigging in survival situations.",
    whenToUse: "When building shelter, securing loads, making splints, or any situation requiring reliable cordage.",
    prerequisites: ["Any cordage: paracord, rope, shoelaces, vines, or strips of clothing"],
    bestOption: "Bowline — creates a fixed loop that won't slip or tighten under load. The most versatile survival knot.",
    backupOption: "Square knot — simple, joins two ends of rope for bandages or securing bundles.",
    steps: [
      "Bowline: form a small loop, pass the working end up through the loop, around the standing line, then back down through the loop.",
      "Clove hitch: wrap rope around a post twice, crossing over itself, tuck under last wrap. Fast way to attach rope to a pole.",
      "Taut-line hitch: for adjustable tension (tent guylines). Wrap twice around the standing line, then once more on the far side, tuck through.",
      "Sheet bend: joins two ropes of different thickness. Form a bight in the thicker rope, pass the thinner through it, around both strands, and under itself.",
      "Figure-8: stopper knot. Form a loop, bring working end around standing line and back through the loop.",
    ],
    warnings: [
      "Always test any knot before trusting your weight or life to it.",
      "Wet ropes are harder to untie — dress the knot properly and check it before use.",
      "Natural cordage (vines, bark) is weaker and less reliable than manufactured rope. Double up when in doubt.",
    ],
    tags: ["knots", "cordage", "rigging", "shelter", "rescue"],
    keywords: ["knot", "rope", "tie", "bowline", "hitch", "cordage", "paracord", "line", "secure", "bind", "lash", "rigging"],
    sourceGuideIds: ["knot-tying"],
    category: "Core Skills",
    iconName: "link-outline",
    riskLevel: "low",
  },
];

export const GUIDE_TO_CARDS: Record<string, string[]> = ACTION_CARDS.reduce((acc, card) => {
  for (const guideId of card.sourceGuideIds) {
    if (!acc[guideId]) acc[guideId] = [];
    acc[guideId].push(card.id);
  }
  return acc;
}, {} as Record<string, string[]>);

export function searchActionCards(query: string, limit = 3): ActionCard[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  const scored = ACTION_CARDS.map((card) => {
    let score = 0;
    for (const kw of card.keywords) {
      if (q.includes(kw)) score += 3;
    }
    for (const w of words) {
      if (card.title.toLowerCase().includes(w)) score += 2;
      if (card.tags.some((t) => t.includes(w))) score += 2;
      if (card.summary.toLowerCase().includes(w)) score += 1;
    }
    return { card, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.card);
}

export function getCardsForGuide(guideId: string): ActionCard[] {
  const cardIds = GUIDE_TO_CARDS[guideId] || [];
  return ACTION_CARDS.filter((c) => cardIds.includes(c.id));
}
