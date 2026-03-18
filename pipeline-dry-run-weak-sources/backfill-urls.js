const fs = require('fs');

// URL lookup map: title -> url
const urlMap = new Map();

const allSources = [
  // Medical/water
  { title: "Emergency water safety guidance", url: "https://www.cdc.gov/water-emergency/about/index.html" },
  { title: "Emergency disinfection of drinking water", url: "https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water" },
  { title: "Emergency WASH materials", url: "https://www.ifrc.org/our-work/health-and-care/water-sanitation-and-hygiene-wash" },
  { title: "Emergency water safety and treatment limits", url: "https://www.cdc.gov/water-emergency/about/index.html" },
  { title: "Emergency water supply guidance", url: "https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html" },
  { title: "Household water storage best practices", url: "https://www.cdc.gov/water-emergency/about/how-to-create-and-store-an-emergency-water-supply.html" },
  { title: "Local emergency chlorination adaptations", url: "https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water" },
  { title: "Signs of Dehydration", url: "https://medlineplus.gov/dehydration.html" },
  { title: "Emergency WASH sanitation guidance", url: "https://www.cdc.gov/water-emergency/safety/guidelines-for-personal-hygiene-during-an-emergency.html" },
  { title: "Emergency hygiene guidance", url: "https://www.cdc.gov/water-emergency/safety/guidelines-for-personal-hygiene-during-an-emergency.html" },
  { title: "Emergency environmental cleaning guidance", url: "https://www.cdc.gov/natural-disasters/safety/index.html" },
  { title: "Emergency WASH and food safety guidance", url: "https://www.cdc.gov/food-safety/foods/keep-food-safe-after-emergency.html" },
  { title: "Wound Infection Warning Signs", url: "https://www.cdc.gov/natural-disasters/communication-resources/emergency-wound-care-after-a-natural-disaster-factsheet.html" },
  { title: "Burn First Aid", url: "https://ameriburn.org/resources/burn-first-aid/" },
  { title: "Burns: How to Help", url: "https://www.redcross.org/take-a-class/resources/learn-first-aid/burns" },
  { title: "Burn First Aid and Burn Center Referral", url: "https://ameriburn.org/resources/burnreferral/" },
  { title: "Burns Guidance", url: "https://www.redcross.org/take-a-class/resources/learn-first-aid/burns" },
  { title: "Food safety during power outages", url: "https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage" },
  { title: "Pet disaster preparedness", url: "https://www.cdc.gov/healthy-pets/emergency-preparedness/index.html" },
  { title: "Pet evacuation planning", url: "https://www.cdc.gov/healthy-pets/emergency-preparedness/index.html" },
  // Preparedness
  { title: "Emergency Preparedness Guidance", url: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html" },
  { title: "Build A Kit / Make A Plan materials", url: "https://www.ready.gov/kit" },
  { title: "Get a Kit, Make a Plan", url: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html" },
  { title: "Family Emergency Communication Plan Templates", url: "https://www.ready.gov/plan" },
  { title: "Emergency Kit Fact Sheets", url: "https://www.ready.gov/sites/default/files/2021-02/ready_checklist.pdf" },
  { title: "Preparedness Kit Maintenance", url: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/survival-kit-supplies.html" },
  { title: "Family plan templates", url: "https://www.ready.gov/plan-form" },
  { title: "Shelter-in-Place Checklists", url: "https://www.ready.gov/shelter" },
  { title: "Preparedness kit guidance", url: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies/survival-kit-supplies.html" },
  { title: "Emergency medication planning", url: "https://www.cdc.gov/prepare-your-health/take-action/prescriptions.html" },
  { title: "Preparedness for medicines", url: "https://www.cdc.gov/prepare-your-health/take-action/prescriptions.html" },
  { title: "Health document backup guidance", url: "https://www.cdc.gov/prepare-your-health/take-action/personal-needs.html" },
  { title: "Household document kit guidance", url: "https://www.ready.gov/emergency-financial-first-aid-kit" },
  { title: "Home medical equipment outage planning", url: "https://asprtracie.hhs.gov/technical-resources/resource/6652/emncy-power-planning-for-people-who-use-electricity-and-battery-dependent-assistive-technology-and-medical-devices" },
  { title: "Veterinary emergency preparedness", url: "https://www.avma.org/resources-tools/pet-owners/emergency-care/pets-and-disasters" },
  { title: "Smoke alarm and home escape planning", url: "https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/home-fire-escape-plans/" },
  { title: "Home hazard checklists", url: "https://www.usfa.fema.gov/prevention/home-fires/prevent-fires/" },
  { title: "Smoke alarm guidance", url: "https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/" },
  { title: "Smoke Alarm Guidance", url: "https://www.usfa.fema.gov/prevention/home-fires/prepare-for-fire/smoke-alarms/" },
  { title: "USFA fire safety materials", url: "https://www.usfa.fema.gov/prevention/home-fires/" },
  { title: "Weather Radio and Wireless Emergency Alerts", url: "https://www.ready.gov/alerts" },
  // Navigation/outdoor
  { title: "Outdoor Emergency Plan", url: "https://www.nps.gov/articles/gtgemergencyplan.htm" },
  { title: "Navigation in poor visibility", url: "https://www.theuiaa.org/mountain-skills-how-to-navigate-in-poor-visibility/" },
  { title: "UIAA Navigation in Poor Visibility", url: "https://www.theuiaa.org/mountain-skills-how-to-navigate-in-poor-visibility/" },
  { title: "Land SAR stay-vs-go guidance", url: "https://www.fs.usda.gov/visit/know-before-you-go/if-you-get-lost" },
  { title: "Beacon registration and use guidance", url: "https://www.sarsat.noaa.gov/register-your-beacon/" },
  { title: "Marine distress and signaling systems", url: "https://www.dco.uscg.mil/OCSNCOE/Maritime-Comms/" },
  { title: "Outdoor emergency signaling guidance", url: "https://www.nps.gov/articles/gtgemergencyplan.htm" },
  { title: "Visual distress signal effectiveness testing", url: "https://www.dco.uscg.mil/CG-ENG-4/VDS/" },
  { title: "Visual Distress Signals", url: "https://www.dco.uscg.mil/CG-ENG-4/VDS/" },
  { title: "Marine distress communications overview", url: "https://www.dco.uscg.mil/OCSNCOE/Maritime-Comms/" },
  { title: "Integrated maritime distress systems", url: "https://www.navcen.uscg.gov/global-maritime-distress-and-safety-system" },
  { title: "Ground-air visual signal codes", url: "https://www.faa.gov/air_traffic/publications/atpubs/aip_html/part1_gen_section_3.6.html" },
  { title: "Post-Landslide Safety Guidance", url: "https://www.ready.gov/landslides-debris-flow" },
  { title: "Outdoor fire-building guidance", url: "https://www.nps.gov/articles/campfires.htm" },
  { title: "Cold-weather and severe-weather safety principles", url: "https://www.cdc.gov/winter-weather/about/index.html" },
  { title: "Hypothermia prevention principles", url: "https://www.cdc.gov/winter-weather/prevention/index.html" },
  { title: "Wildfire-prevention fire-out guidance", url: "https://smokeybear.com/en/prevention-how-tos/campfire-safety" },
  { title: "Outdoor fire-safety principles", url: "https://www.nps.gov/articles/000/idkt-lnt5.htm" },
  { title: "U.S. Army Survival Field Manual ATP 3-50.21 (and FM 21-76)", url: "https://armypubs.army.mil/ProductMaps/PubForm/Details.aspx?PUB_ID=1005316" },
];

for (const s of allSources) {
  if (s.url) urlMap.set(s.title, s.url);
}

console.log("URL lookup map:", urlMap.size, "entries");

// Load guide data
const guides = JSON.parse(fs.readFileSync(process.env.TEMP + "/url_backfill_guides.json", "utf8"));

let totalUpdated = 0;
let totalRefsFixed = 0;
let totalRefsUnresolved = 0;
const updates = [];

for (const g of guides) {
  const refs = g.refs;
  let changed = false;
  const updatedRefs = refs.map(r => {
    if (typeof r === "object" && r.title && !r.url) {
      const url = urlMap.get(r.title);
      if (url) {
        totalRefsFixed++;
        changed = true;
        return { ...r, url };
      } else {
        totalRefsUnresolved++;
        return r;
      }
    }
    return r;
  });

  if (changed) {
    totalUpdated++;
    updates.push({ slug: g.slug, guideId: g.guideId, versionId: g.versionId, source_references: updatedRefs });
  }
}

console.log("Guides to update:", totalUpdated);
console.log("References fixed:", totalRefsFixed);
console.log("References unresolved:", totalRefsUnresolved);

fs.writeFileSync(process.env.TEMP + "/url_backfill_updates.json", JSON.stringify(updates, null, 2));
console.log("Saved", updates.length, "update payloads");
