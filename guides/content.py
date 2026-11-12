# Fettle free guides: content.
# Each guide is plain HTML for the article body. Keep sentences short and plain.
# Every fact should come from a source in "sources". Update CHECKED when you re-check them.

CHECKED = "12 November 2026"

S = {  # shared sources
    "fsa_power": ("Food Standards Agency: food safety in a power cut", "https://www.gov.uk/government/publications/food-safety-in-a-power-cut-advice-for-consumers/food-safety-in-a-power-cut-advice-for-consumers"),
    "cmo_food": ("UK Chief Medical Officers: food and nutrition in a national power outage", "https://www.gov.uk/government/publications/public-health-advice-from-uk-cmos-during-a-national-power-outage/food-and-nutrition-scripts-for-broadcast-media"),
    "beready": ("Cabinet Office: Be Ready, households encouraged to take small, simple steps", "https://www.gov.uk/government/news/households-encouraged-to-take-small-simple-steps-to-stay-prepared-in-an-emergency"),
    "gmfrs_stay": ("Greater Manchester Fire and Rescue Service: flats with a stay safe policy", "https://manchesterfire.gov.uk/your-safety/home-fire-safety/flat-safety/what-is-your-building-s-evacuation-strategy/fire-safety-information-for-residents-living-in-flats-operating-a-stay-safe-policy/"),
    "gmfrs_faq": ("Greater Manchester Fire and Rescue Service: high-rise residents' FAQs", "https://www.manchesterfire.gov.uk/your-safety/high-rise-and-building-safety-taskforce/support-for-high-rise-residents/residents-faqs"),
    "nhs_flask": ("NHS: formula milk, common questions (making up a feed away from home)", "https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/bottle-feeding/formula-milk-questions/"),
    "nhs_feed": ("NHS Start for Life: how to make up a formula feed", "https://www.nhs.uk/start-for-life/baby/feeding-your-baby/bottle-feeding/how-to-make-up-a-feed"),
    "fsa_formula": ("Food Standards Agency: preparing infant formula safely during water supply disruptions (2 November 2026)", "https://www.gov.uk/government/publications/preparing-infant-formula-safely-during-water-supply-disruptions-and-when-travelling"),
    "ofgem_psr": ("Ofgem: join your supplier's Priority Services Register", "https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/join-your-suppliers-priority-services-register"),
    "psr": ("The Priority Services Register (energy networks)", "https://www.thepsr.co.uk"),
    "enwl_psr": ("Electricity North West: Priority Services Register", "https://www.enwl.co.uk/priority"),
    "uu_psr": ("United Utilities: Priority Services", "https://www.unitedutilities.com/priorityservices"),
    "ofcom_power": ("Ofcom: guidance on access to emergency calls during a power cut", "https://www.ofcom.org.uk/__data/assets/pdf_file/0016/123118/guidance-emergency-access-power-cut.pdf"),
    "alarms": ("GOV.UK: smoke and carbon monoxide alarms, booklet for landlords", "https://www.gov.uk/government/publications/smoke-and-carbon-monoxide-alarms-explanatory-booklet-for-landlords"),
    "redcross": ("British Red Cross: learn first aid (free)", "https://www.redcross.org.uk/first-aid/learn-first-aid"),
    "cmo_water": ("UK Chief Medical Officers: water and sanitation scripts for a national power outage", "https://www.gov.uk/government/publications/public-health-advice-from-uk-cmos-during-a-national-power-outage/water-and-sanitation-scripts-for-broadcast-media"),
    "cmo_warm": ("UK Chief Medical Officers: keeping warm or cool scripts for a national power outage", "https://www.gov.uk/government/publications/public-health-advice-from-uk-cmos-during-a-national-power-outage/keeping-warm-or-cool-in-extreme-weather-scripts-for-broadcast-media"),
    "cmo_all": ("UK Chief Medical Officers: public health advice during a national power outage (all scripts)", "https://www.gov.uk/government/publications/public-health-advice-from-uk-cmos-during-a-national-power-outage"),
    "lw": ("RadioToday: BBC sets June date for Radio 4 long wave closedown", "https://radiotoday.co.uk/2026/05/bbc-sets-june-date-for-radio-4-long-wave-closedown/"),
    "bbc_black": ("BBC News: Black Sky events, Lancaster and the BBC's emergency radio plan (November 2026)", "https://www.bbc.co.uk/news/articles/ck5ynnj05z8no"),
    "lancs": ("Lancaster University: learning from Lancaster's power cuts (May 2016)", "https://www.lancaster.ac.uk/sci-tech/about-us/news/archive/2016/may/learning-from-lancasters-power-cuts/"),
    "rae": ("Royal Academy of Engineering: Living without electricity, one city's experience of coping with loss of power (Kemp, 2016)", "https://eprints.lancs.ac.uk/id/eprint/83870"),
    "ofgem_cut": ("Ofgem: check if you can get a payment for a power cut", "https://www.ofgem.gov.uk/information-consumers/check-if-you-can-get-payment-power-cut"),
    "ca_prepay": ("Citizens Advice: you can't afford to top up your prepayment meter", "https://www.citizensadvice.org.uk/consumer/energy/energy-supply/get-help-paying-your-bills/you-cant-afford-to-top-up-your-prepayment-meter/"),
    "crf": ("Sustain: DWP launches the Crisis and Resilience Fund (April 2026)", "https://www.sustainweb.org/news/apr26-dwp-launches-crisis-and-resilience-fund/"),
    "nations": ("Money Wellness: cost-of-living help in Wales, Scotland and Northern Ireland", "https://moneywellness.com/money-booster/cost-of-living-help/government-cost-of-living-help-in-wales-scotland-and-northern-ireland"),
    "awaab2": ("Clyde & Co: Awaab's Law Phase 2 (August 2026)", "https://www.clydeco.com/en/insights/2026/08/awaab-s-law-phase-2-the-next-compliance-challenge"),
    "awaab": ("Shelter England: how Awaab's Law changes the rules on hazards in social housing", "https://england.shelter.org.uk/professional_resources/news_and_updates/how_awaabs_law_changes_the_rules_on_hazards_in_social_housing"),
    "rpeeps": ("GOV.UK: Residential PEEPs factsheet", "https://www.gov.uk/government/publications/residential-personal-emergency-evacuation-plans-residential-peeps/residential-peeps-factsheet"),
    "swep": ("West Northamptonshire Council: help for people sleeping rough in very cold or extreme weather", "https://www.westnorthants.gov.uk/housing-advice-and-support/help-people-sleeping-rough-very-cold-or-extreme-weather"),
    "survey_sd": ("Cabinet Office: 2025 preparedness survey, supplementary sociodemographic analyses", "https://www.gov.uk/government/statistics/uk-public-survey-of-risk-perception-resilience-and-preparedness-2025/uk-public-survey-of-risk-perception-resilience-and-preparedness-2025-supplementary-sociodemographic-analyses"),
    "nhs_hypo": ("NHS: hypothermia", "https://www.nhs.uk/conditions/hypothermia/"),
    "nhs_heat": ("NHS: heat exhaustion and heatstroke", "https://www.nhs.uk/conditions/heat-exhaustion-heatstroke/"),
    "nhs_co": ("NHS: carbon monoxide poisoning", "https://www.nhs.uk/conditions/carbon-monoxide-poisoning/"),
    "nhs_use": ("NHS Best Start in Life: how to use formula (ready-to-feed, leftovers)", "https://www.nhs.uk/best-start-in-life/baby/feeding-your-baby/bottle-feeding/how-to-make-up-a-feed/how-to-use-formula/"),
    "lullaby": ("The Lullaby Trust: safer sleep in cold weather", "https://www.lullabytrust.org.uk/baby-safety/travel-and-weather/cold-weather/"),
    "lullaby_em": ("The Lullaby Trust: safer sleep advice for emergency situations", "https://www.lullabytrust.org.uk/wp-content/uploads/2025/01/Safer-sleep-in-emergency-situations.pdf"),
    "cadent_co": ("Cadent: gas safety factsheet for carers (carbon monoxide, smelling gas)", "https://cadentgas.com/getmedia/930d74bb-c981-4044-8a67-60b4dc4befe5/Gas-safety-factsheet-for-carers.pdf"),
    "cadent_valve": ("Cadent: how to find your gas meter and turn off the gas supply", "https://cadentgas.com/locating-your-meter-and-turning-off-the-gas"),
    "lfb_balcony": ("London Fire Brigade: don't barbecue on your balcony", "https://www.london-fire.gov.uk/news/2019-news/august/enjoy-the-warm-weather-but-don-t-barbeque-on-your-balcony/"),
    "fire_home": ("GOV.UK: Fire safety in the home (Fire Kills)", "https://www.gov.uk/government/publications/make-your-home-safe-from-fire/fire-safety-in-the-home-accessible-version"),
    "dwfire": ("Dorset and Wiltshire Fire and Rescue Service: power cuts", "https://www.dwfire.org.uk/safety/storms-and-power-cuts/power-cuts/"),
    "beready_kit": ("Cabinet Office: Be Ready for emergencies (what to keep at home)", "https://beready.campaign.gov.uk/be-ready-for-emergencies/"),
    "beready_power": ("Cabinet Office: Be Ready, power cuts", "https://beready.campaign.gov.uk/be-informed-about-hazards/power-cuts/"),
    "beready_water": ("Cabinet Office: Be Ready, water supply interruptions", "https://beready.campaign.gov.uk/be-informed-about-hazards/water-supply-interruptions-or-outages/"),
    "ca_powercut": ("Citizens Advice: prepare for a power cut", "https://www.citizensadvice.org.uk/consumer/energy/energy-supply/problems-with-your-energy-supply/prepare-for-a-power-cut/"),
    "dwi_boil": ("Drinking Water Inspectorate: receiving a boil water notice", "https://www.dwi.gov.uk/receiving-a-boil-water-notice/"),
    "fsa_dates": ("Food Standards Agency: best before and use-by dates", "https://www.food.gov.uk/safety-hygiene/best-before-and-use-by-dates"),
    "flood": ("GOV.UK: what to do before or during a flood", "https://www.gov.uk/help-during-flood"),
    "iddt": ("InDependent Diabetes Trust: storing insulin", "https://iddt.org/about/living-with-diabetes/storing-insulin"),
    "elec": ("GOV.UK: electrical safety standards in the private and social rented sectors", "https://www.gov.uk/government/publications/electrical-safety-standards-in-the-private-and-social-rented-sectors-guidance/electrical-safety-standards-in-the-private-and-social-rented-sectors-guidance"),
    "awaab_gov": ("GOV.UK: Awaab's Law in the social rented sector (phases and dates)", "https://www.gov.uk/government/collections/awaabs-law-in-the-social-rented-sector"),
    "awaab_tenants": ("GOV.UK: Awaab's Law, guidance for tenants in social housing", "https://www.gov.uk/government/publications/awaabs-law-guidance-for-tenants-in-social-housing/awaabs-law-guidance-for-tenants-in-social-housing"),
    "rpeeps_guide": ("GOV.UK: Residential PEEPs, guidance for responsible persons", "https://assets.publishing.service.gov.uk/media/692838312a37784b16ecf629/Residential_PEEPs_Guidance_for_Responsible_Persons.pdf"),
    "crf_gov": ("GOV.UK: Crisis and Resilience Fund, guidance for local authorities in England (1 April 2026 to 31 March 2029)", "https://www.gov.uk/government/publications/crisis-and-resilience-fund-guidance-for-local-authorities-in-england-1-april-2026-to-31-march-2029/the-crisis-and-resilience-fund-guidance-for-local-authorities-in-england-1-april-2026-to-31-march-2029"),
    "survey": ("Cabinet Office: UK public survey of risk perception, resilience and preparedness 2026", "https://www.gov.uk/government/statistics/uk-public-survey-of-risk-perception-resilience-and-preparedness-2026/uk-public-survey-of-risk-perception-resilience-and-preparedness-2026-headline-findings-html"),
}

CATS = [
    ("start", "Start here"),
    ("power", "Power cuts"),
    ("water", "Water"),
    ("food", "Food"),
    ("home", "Your home"),
    ("people", "People you look after"),
    ("help", "Money and support"),
]

NUMBERS = """<div class="numbers"><h2>Numbers to keep on paper</h2><dl>
<div><dt>Power cut</dt><dd><b>105</b> (free, any network)</dd></div>
<div><dt>Smell gas</dt><dd><b>0800 111 999</b></dd></div>
<div><dt>Life at risk</dt><dd><b>999</b>. If you can't speak, register for emergencySMS: text <b>register</b> to <b>999</b></dd></div>
<div><dt>Not an emergency, need medical help</dt><dd><b>111</b></dd></div>
</dl></div>"""

GUIDES = [

# ---------------------------------------------------------------- LANCASTER
dict(
slug="lessons-from-lancaster", cat="start", mins=6, flag=None,
title="When a city lost power for four days: lessons from Lancaster",
summary="In December 2015, floodwater cut power to more than 61,000 homes and businesses in Lancaster. What stopped, what kept working, and what it means for your home now.",
body="""
<p class="lede">At 22:45 on Saturday 5 December 2015, Storm Desmond pushed the River Lune into an electricity substation, and Lancaster went dark. Power didn't fully return until 9 December. It's the closest the UK has come to a real test of the government's three-day advice.</p>

<h2>What stopped</h2>
<ul>
<li><b>Light and heat,</b> in homes and in care homes.</li>
<li><b>Water, in some places,</b> where supplies relied on electric pumps.</li>
<li><b>Mobile phones, the internet and TV.</b> People walked the streets looking for signal, and there was a long queue at the one working phone box.</li>
<li><b>Money.</b> Card payments stopped, and most cash machines didn't work.</li>
<li><b>Fuel and shops.</b> Petrol pumps need electricity. Food shops threw away stock from their fridges and freezers.</li>
<li><b>Travel.</b> The railway station closed and the traffic lights failed.</li>
<li><b>Schools and the university</b> closed.</li>
</ul>
<p>Professor Roger Kemp of Lancaster University later described the next morning as "almost like a zombie movie".</p>

<h2>What kept working</h2>
<p>Two things: old copper-wire landlines, and <b>FM radio</b>. The local station, The Bay, had a generator and one landline, and sent a reporter outside the blackout to phone in news. Professor Kemp's report for the Royal Academy of Engineering concluded that the most reliable source of news was a radio station using 1960s technology.</p>

<h2>What's changed since</h2>
<ul>
<li><b>Copper landlines are going.</b> The old phone network, which worked in a power cut, is due to be switched off on 31 January 2027. Home phones will then run through your broadband router, which needs mains power. Ask your provider about a battery backup, especially if anyone uses a care alarm.</li>
<li><b>Radio 4 has left long wave.</b> FM is now the way to hear national advice. The BBC has its own plan to keep FM broadcasting for at least three days in a national blackout, carrying the government's prepared health advice.</li>
<li><b>Three days is the official aim.</b> The BBC reports that the National Energy System Operator's latest advice is that, after a national failure, power could probably be restored in two to three days.</li>
<li><b>Sewers need power too.</b> Lord Harris, chair of the National Preparedness Commission, warned the BBC that without water moving through it, sewage can block and back up. That's why official advice in a national power cut is <a href="national-power-cut.html">not to flush</a>.</li>
</ul>

<h2>The lesson in one cupboard</h2>
<p>While writing about all this in November 2026, a BBC reporter lost power on his own street. His torch batteries had leaked, his candles were at the back of a cupboard, and he couldn't find his wind-up radio. Most of us are the same.</p>

<h2>What Lancaster means for your home</h2>
<ol class="todo">
<li><b>An FM radio</b> with batteries or a wind-up handle, in a place everyone knows. Write your stations' frequencies on it. See <a href="emergency-radio.html">which radio to keep</a>.</li>
<li><b>Torch batteries kept outside the torch,</b> in their packet beside it, so they can't leak. Check them every season.</li>
<li><b>Some cash at home,</b> about £10 per person, in notes and coins.</li>
<li><b>3 days of water,</b> especially if your water relies on a pump or you live high up.</li>
<li><b>Food that needs no cooking or fridge,</b> because the shops may be shut too.</li>
<li><b>A plan for keeping in touch without phones.</b> Agree now who will check on whom, and where you'll meet.</li>
<li><b>A quarter of a tank of fuel,</b> if you drive. Petrol pumps stop too.</li>
<li><b>Ask about your landline,</b> before the copper network is switched off on 31 January 2027.</li>
</ol>
""",
sources=["bbc_black", "lancs", "rae", "beready"],
),

# ---------------------------------------------------------------- NATIONAL POWER CUT
dict(
slug="national-power-cut", cat="start", mins=7, flag=None,
title="If the whole country loses power: what the doctors will tell you",
summary="The UK's Chief Medical Officers have already written the radio scripts they'd read out in a national blackout. Here's what they say, in plain words, and what to get ready now.",
body="""
<p class="lede">A UK-wide power cut is very unlikely. But the government has planned for one, and in December 2025 it published the exact advice the UK's four Chief Medical Officers would read out on the radio. Knowing it now means you'll have what you need, and you won't have to work it out in the dark.</p>

<div class="tip"><b>Where you'll hear it.</b> Phones, internet and TV may not work. The advice would go out on <b>BBC Radio 2 and Radio 4</b>, repeated regularly. You'll need a battery or wind-up radio with FM, and a pen and paper: the scripts start by telling you to write the advice down. See <a href="emergency-radio.html">which radio to keep</a>.</div>

<h2>Water: drink, but save it</h2>
<ul>
<li>Drink <b>at least 2 litres a day</b>, about 8 cups. Water, bottled water, soft and fizzy drinks, and the juice from tinned fruit all count.</li>
<li>Cold tap water is safe while it's still flowing normally.</li>
<li>Count what drinks you have at home, and work out how long they'll last at 8 cups each a day. Keep track each day.</li>
<li>Babies, children, pregnant and breastfeeding women and older people need fluids most. Children under 2 who aren't breastfed need at least 1 litre a day, and formula counts towards it.</li>
<li><b>Don't drink alcohol.</b> It dehydrates you. Low-alcohol drinks under 1.2% are fine if water runs out.</li>
<li>Don't drink milk or fresh fruit juice that smells off.</li>
</ul>

<h2>Toilets: don't flush</h2>
<p>Without power, the sewers stop working. The advice is <b>not to flush at all</b>. Line the toilet with a strong bin bag, then seal it and put it in your normal household waste, ideally an outside bin. Wash your hands afterwards.</p>

<h2>Washing hands: one shared bowl</h2>
<ul>
<li>Fill a washing-up bowl with water and add soap or household disinfectant. Everyone uses it for the whole power cut, without changing the water.</li>
<li>Anyone with diarrhoea uses their own separate bowl.</li>
<li>Soap and water works better than hand sanitiser. Use sanitiser only if there's nothing else.</li>
<li>Don't use water for showers or baths.</li>
</ul>

<h2>Food: perishables first</h2>
<ul>
<li>Check how much food you have for the next few days.</li>
<li>Eat chilled food first, then frozen food as it defrosts, then fresh food, then tins and packets. Our guide to <a href="eating-safely-without-power.html">eating safely without power</a> has the details.</li>
<li>After 4 hours without power, babies, young children, pregnant and breastfeeding women, older people and anyone with a weakened immune system shouldn't eat chilled ready-to-eat food or leftovers.</li>
<li>Throw away rotting food straight away, in an outside bin.</li>
<li>Cook only outdoors, on a camping stove, barbecue or safe campfire. Food may take longer to cook, so make sure it's steaming hot all the way through.</li>
</ul>

<h2>If the water runs out</h2>
<p>From the second day, the scripts explain how to make rainwater or water from a water butt, lake or stream safer to drink, by filtering it and then boiling it, using purification tablets, or using a small amount of household bleach. Follow <a href="making-water-safe.html">our step-by-step guide</a> exactly.</p>

<h2>If someone has diarrhoea</h2>
<p>Keep them drinking. Use rehydration sachets if you have them. If you don't, the scripts give a homemade recipe: add <b>6 level teaspoons of sugar, 1 level teaspoon of salt and 1 heaped teaspoon of bicarbonate of soda to 1 litre of fluid</b>. Measure exactly: too much salt is dangerous. For a baby or young child, use sachets, or ask a pharmacist or call 111 first. They should use their own bowl for handwashing, and shouldn't prepare food for others.</p>

<h2>In very cold or very hot weather</h2>
<ul>
<li><b>Cold</b> (the advice starts at minus 2°C): stay in, gather in one room, wear thin layers, keep your feet up and move every hour. Never use camping stoves, barbecues or generators indoors. See <a href="keeping-warm.html">keeping warm</a>.</li>
<li><b>Heat</b> (the advice starts at 38°C): keep sunny windows and curtains closed, open windows only when it's cooler outside, and drink plenty. See <a href="keeping-cool.html">keeping cool</a>.</li>
<li>In both: look out for neighbours, friends and family who may be struggling.</li>
</ul>

<h2>Get these ready now</h2>
<ol class="todo">
<li>A battery or wind-up radio with FM, spare batteries, and a pen and notepad kept beside it.</li>
<li>Bottled water: 3 litres per person per day for 3 days.</li>
<li>Strong bin bags for the toilet, a washing-up bowl, and soap.</li>
<li>Rehydration sachets in your first aid kit.</li>
<li>Water purification tablets and a small bottle of unscented household bleach, kept away from children.</li>
<li>Food that doesn't need cooking or a fridge.</li>
<li>Agree who in your household checks on which neighbours.</li>
</ol>
<p class="sm">These scripts are written by the Chief Medical Officers as independent advisers, not as government policy. If a real emergency happens, follow what is broadcast at the time.</p>
""",
sources=["cmo_all", "cmo_water", "cmo_food", "cmo_warm"],
),

# ---------------------------------------------------------------- MAKING WATER SAFE
dict(
slug="making-water-safe", cat="water", mins=4, flag=None,
title="Making water safe to drink when the bottles run out",
summary="The official method for rainwater, water butts and lakes: collect, filter, then boil, use tablets, or use a measured drop of bleach. Only if safe drinks have run out.",
body="""
<p class="lede">Only do this if your bottled water and other safe drinks have run out. These steps come from the UK Chief Medical Officers' advice for a national power cut. Follow them exactly.</p>

<div class="flag"><b>Only if nothing else is left.</b> Stored bottled water is always better. If your water company or the radio gives different advice at the time, follow that.</div>

<h2>Where to get water, best first</h2>
<ol>
<li>Water from the hot water tank or tap</li>
<li>Rainwater, or melted snow or ice in winter</li>
<li>A water butt</li>
<li>A reservoir, freshwater lake or free-flowing stream, only if it's very close and you can get there safely</li>
<li>River water is much less safe. Use it only as a last resort.</li>
</ol>
<p>Never drink flood water. It can contain sewage.</p>

<h2>Step by step</h2>
<ol class="todo">
<li><b>Collect it in a clean container.</b> Never use one that has held chemicals, fuel or paint.</li>
<li><b>Look at it.</b> If there's an oily film on top, don't drink it.</li>
<li><b>Filter it</b> through a coffee filter, a pillowcase or a bed sheet. Throw away what's caught, and repeat until the water runs clear.</li>
<li><b>Disinfect it.</b> Either boil it, or use in-date water purification tablets.</li>
<li><b>If you can't boil it and have no tablets,</b> use ordinary household bleach, ideally unscented: <b>a quarter of a teaspoon for every 10 litres</b> (about a bucketful). Stir and leave it for <b>15 minutes</b>. Don't use more. Use plain bleach: not thick bleach, and not a cleaner with bleach in it.</li>
<li><b>Smell it.</b> Treated water should smell slightly of chlorine. If the smell is very strong, leave it uncovered for 2 hours before drinking.</li>
<li><b>Store it</b> somewhere cool and dark, covered.</li>
</ol>
<p>Water treated this way is for <b>drinking only</b>. Use other water for handwashing and cooking.</p>

<h2>Keep these in the cupboard</h2>
<ul class="check">
<li>Water purification tablets, checked for their date each season</li>
<li>A small bottle of unscented household bleach and a measuring teaspoon, out of children's reach</li>
<li>A clean bucket with a lid, used only for water</li>
<li>Coffee filters, or a spare pillowcase</li>
</ul>
""",
sources=["cmo_water", "cmo_all", "flood", "beready_water"],
),

# ---------------------------------------------------------------- KEEPING COOL
dict(
slug="keeping-cool", cat="power", mins=4, flag=None,
title="Keeping cool in a heatwave when the power is off",
summary="No fans, no fridge, and water may be short. How to keep a home cool, and the signs of heat exhaustion and heatstroke.",
body="""
<p class="lede">Summers are getting hotter. A power cut in a heatwave means no fans and no cold drinks from the fridge, and heat is dangerous for babies, young children, pregnant women, older people and anyone who needs care.</p>

<h2>Keep the home cool</h2>
<ul>
<li>During the day, close windows, blinds and curtains that face the sun. Close outside shutters if you have them.</li>
<li>Open windows only when it's cooler outside than in, usually in the evening and at night.</li>
<li>Sit and sleep in the coolest room.</li>
<li>If you have to go out for water, food or to check on someone, go at the coolest time of day.</li>
</ul>

<h2>Drink more</h2>
<p>Drink at least 2 litres a day, about 8 cups, and more in the heat. Store 3 litres per person per day so there's enough.</p>

<h2>Signs of heat exhaustion</h2>
<p>Tiredness, weakness, feeling faint, a headache, muscle cramps, feeling or being sick, heavy sweating and intense thirst.</p>

<h2>Signs of heatstroke</h2>
<p>Heat exhaustion can turn into heatstroke, which is an emergency. Look for confusion, clumsiness, a fast heartbeat, fast or shallow breathing, hot skin, and fits (seizures).</p>

<h2>What to do</h2>
<ol>
<li>Move them indoors or into the shade.</li>
<li>Take off extra clothing, such as jackets and socks.</li>
<li>Give them water, a fizzy drink or another drink.</li>
<li>Spray or sponge them with cool water. It doesn't need to be drinking water, so don't use the water you've made safe to drink.</li>
<li>They should start to cool down and feel better within 30 minutes.</li>
<li><b>Call 999</b> if they're still unwell after 30 minutes, or if they show any sign of heatstroke. While you wait, keep cooling them.</li>
</ol>

<h2>Check on others</h2>
<p>Look out for neighbours, friends and family who may be struggling, especially older people living alone. See <a href="checking-on-someone.html">checking on someone</a>.</p>
""",
sources=["cmo_warm", "cmo_all", "nhs_heat"],
),

# ---------------------------------------------------------------- RADIO
dict(
slug="emergency-radio", cat="power", mins=3, flag=None,
title="Which radio to keep for a power cut",
summary="In a national blackout, health advice goes out on BBC Radio 2 and Radio 4. Long wave has gone, so you need FM. What to buy and what to write down.",
body="""
<p class="lede">If the power, phones and internet all go down, radio is how official advice would reach you. The government's plan is for the UK's Chief Medical Officers to broadcast health advice on <b>BBC Radio 2 and Radio 4</b>, repeated regularly.</p>

<h2>Get a radio with FM</h2>
<ul>
<li>BBC Radio 4 stopped broadcasting on long wave in June 2026. An old long wave set won't pick it up.</li>
<li>Choose a radio with <b>FM</b>. FM carries Radio 2, Radio 4 and your BBC local station, which has local news.</li>
<li>Pick one that runs on ordinary AA or AAA batteries, and keep spares. A wind-up or solar radio is a good backup, because it never runs out.</li>
<li>A car radio works too, but never run the engine in a closed garage.</li>
</ul>

<h2>Why FM</h2>
<p>When Lancaster lost power for four days in 2015, FM radio was one of only two things that kept working, along with old copper landlines. The BBC's emergency plan keeps its FM transmitters running on diesel generators for at least three days. <a href="lessons-from-lancaster.html">What Lancaster teaches us</a></p>

<h2>Write these down now</h2>
<p>In a power cut, you can't look up the frequencies. Tune in now and write on a label stuck to the radio:</p>
<ul class="check">
<li>BBC Radio 2 on FM: ______</li>
<li>BBC Radio 4 on FM: ______</li>
<li>Your BBC local radio station on FM: ______</li>
</ul>

<h2>Keep a pen and paper with it</h2>
<p>The broadcast scripts begin by suggesting you write the advice down. Keep a notepad and pen with the radio. Fettle's book has a page for these notes.</p>

<h2>Test it each season</h2>
<p>Turn it on, check the batteries haven't leaked, and check it still finds your stations. Keep spare batteries in their packet next to the radio, not inside it.</p>
""",
sources=["cmo_all", "lw", "bbc_black", "beready"],
),

# ---------------------------------------------------------------- HIGH RISE
dict(
slug="high-rise-flats", cat="home", mins=6, flag=None,
title="Living in a high-rise flat: power cuts, water and fire",
summary="Lifts stop, water pumps stop, door entry may not work and you can't cook on a balcony. What's different above the third floor, and what to sort now.",
body="""
<p class="lede">Most emergency advice is written for houses. If you live in a block, a power cut changes more than the lights. Here's what's different, and what to sort out while things are normal.</p>

<h2>What stops when the power goes</h2>
<ul>
<li><b>The lifts.</b> Plan as if you'll be using the stairs, maybe for days. If anyone in your home couldn't manage the stairs, see "If someone can't use the stairs" below.</li>
<li><b>The water, on higher floors.</b> Many blocks pump water up to the top floors. When the pumps stop, taps upstairs can run dry quickly, even though the water main is fine. Keep bottled water in the flat, and fill bottles and pans as soon as you're warned of a cut.</li>
<li><b>The door entry.</b> Buzzers, fobs and keypads need power. Depending on the system, the main door may lock shut or be left open. Carers, nurses and family may not be able to get in, and you may not be able to buzz anyone up. Find out now what your building's door does, and agree a plan with anyone who visits regularly.</li>
<li><b>Corridor and stair lighting.</b> Emergency lights only run for a limited time on batteries. Keep a head torch by the door, so both hands are free on the stairs.</li>
<li><b>Electric hob and heating.</b> Most flats have no gas. You'll need food that doesn't need cooking, and a plan for keeping warm.</li>
</ul>

<h2>Never cook or heat with flames indoors or on a balcony</h2>
<p>A barbecue, camping stove or outdoor heater gives off carbon monoxide, which can kill quickly and without warning. Balconies count as indoors for this: fumes come back in, and a fire on a balcony can spread up the building. Fire services say never to barbecue on a balcony. If you have no gas hob, plan for <a href="no-cook-meals.html">no-cook meals</a>.</p>

<h2>If there's a fire</h2>
<p>Find out your building's fire strategy now. Your landlord, managing agent or housing provider must be able to tell you. Many high-rise blocks have a <b>stay safe</b> (or "stay put") policy. In Greater Manchester, the fire service says that for those buildings:</p>
<ul>
<li><b>If the fire is in your flat:</b> get everyone out, close the door behind you, leave the building and call 999.</li>
<li><b>If the fire is somewhere else in the building:</b> you're usually safer staying in your flat, unless heat or smoke is affecting you, you feel unsafe, or firefighters tell you to leave.</li>
<li><b>Use the stairs, never the lift.</b></li>
<li><b>When you call 999,</b> give the building name, your flat number and which floor you're on.</li>
</ul>
<p>Some buildings have a different strategy, such as everyone leaving when the alarm sounds. Follow the one for your building, and the instructions of firefighters on the day.</p>

<h2>If someone can't use the stairs</h2>
<p>Tell your landlord or building manager if anyone in your home would struggle to get down the stairs in an emergency, because of age, disability, illness or a baby and other small children. Ask them to record it and whether they'll make a personal evacuation plan. Tell the fire service when you call 999, too. In England, taller blocks must now offer this if you ask: see <a href="social-housing.html">Residential PEEPs</a>.</p>
<p>Also join the <a href="priority-services-register.html">Priority Services Register</a>. It's free, and it means the power and water companies know about you.</p>

<h2>Sort these out this week</h2>
<ol class="todo">
<li>Ask your landlord or building manager: what's our fire strategy, and what does the main door do in a power cut?</li>
<li>Store bottled water: 3 litres per person per day, for 3 days. For 2 people that's 18 litres.</li>
<li>Put a head torch and spare batteries by the front door.</li>
<li>Stock 3 days of food that doesn't need cooking or a fridge.</li>
<li>Charge a power bank and keep it charged.</li>
<li>Agree with carers and family how they'll get in if the buzzer doesn't work.</li>
<li>If anyone can't manage the stairs, tell your landlord and join the Priority Services Register.</li>
</ol>
""",
sources=["gmfrs_stay", "gmfrs_faq", "fire_home", "lfb_balcony", "nhs_co", "rpeeps", "beready", "fsa_power", "psr"],
),

# ---------------------------------------------------------------- NO-COOK
dict(
slug="no-cook-meals", cat="food", mins=5, flag=None,
title="No-cook meals from your cupboard",
summary="Six simple recipes that need no cooker, no fridge and no washing-up water to speak of, plus a 3-day cupboard list.",
body="""
<p class="lede">If your hob is electric, a power cut means no hot food. These meals need a tin opener, a bowl and a spoon. They use things you probably already buy, so nothing goes to waste: eat them in normal weeks and replace them.</p>

<div class="tip"><b>Two rules without a fridge.</b> Make only what you'll eat now, because leftovers can't be kept. And once a tin is open, use it that day.</div>

<div class="recipes">
<div class="recipe"><h3>Bean and sweetcorn salad</h3><p class="rs">Serves 2</p>
<ul><li>1 tin of beans or chickpeas, drained</li><li>1 small tin of sweetcorn, drained</li><li>1 tin of tuna or mackerel (or a tin of lentils)</li><li>A squeeze of bottled lemon juice, salt and pepper</li></ul>
<p>Mix everything in a bowl and eat straight away.</p></div>

<div class="recipe"><h3>Chickpea smash on crackers</h3><p class="rs">Serves 2</p>
<ul><li>1 tin of chickpeas, drained</li><li>1 tablespoon of peanut butter, or a little olive oil</li><li>Salt, pepper and any dried herbs</li><li>Crackers, oatcakes or wraps</li></ul>
<p>Mash the chickpeas with a fork, stir in the rest and spread on crackers.</p></div>

<div class="recipe"><h3>Overnight oats</h3><p class="rs">Serves 1</p>
<ul><li>4 tablespoons of oats</li><li>About 150ml of long-life milk (or long-life oat or soya milk)</li><li>A few spoonfuls of tinned fruit</li></ul>
<p>Stir the oats and milk in a jar or cup and leave for at least 2 hours, or overnight. Top with fruit. With no fridge, use opened long-life milk within the day.</p></div>

<div class="recipe"><h3>Wrap-ups</h3><p class="rs">Serves 1</p>
<ul><li>1 tortilla wrap</li><li>Half a tin of chicken or tuna, or some mashed beans</li><li>A spoonful of sweetcorn</li></ul>
<p>Spread, add the sweetcorn and roll up.</p></div>

<div class="recipe"><h3>Fruit and custard</h3><p class="rs">Serves 2</p>
<ul><li>1 tin of fruit, drained</li><li>2 ready-to-eat custard or rice pudding pots</li></ul>
<p>Spoon the fruit over the pudding. Good comfort food for children.</p></div>

<div class="recipe"><h3>Peanut butter crackers</h3><p class="rs">Snack</p>
<ul><li>Crackers or oatcakes</li><li>Peanut butter (or sunflower seed butter if anyone has a nut allergy)</li><li>Dried fruit</li></ul>
<p>Spread and top with dried fruit.</p></div>
</div>

<h2>Swaps for allergies and diets</h2>
<ul>
<li><b>Gluten-free:</b> gluten-free oats, crackers, rice cakes and wraps.</li>
<li><b>Dairy-free:</b> long-life oat or soya milk, and dairy-free pudding pots.</li>
<li><b>Nut allergy:</b> sunflower seed butter, and check labels on crackers and cereal bars.</li>
<li><b>Vegetarian:</b> swap fish and chicken for tinned lentils, beans or chickpeas.</li>
</ul>

<h2>A 3-day cupboard for 2 people</h2>
<p>Roughly what the meals above use, with a little extra. Buy what you'd actually eat.</p>
<ul class="cols">
<li>6 tins of beans, chickpeas or lentils</li><li>4 tins of fish or chicken</li><li>3 tins of sweetcorn</li><li>4 tins of fruit</li><li>A bag of oats</li><li>2 litres of long-life milk</li><li>2 packs of crackers or oatcakes, and wraps</li><li>A jar of peanut butter</li><li>Pudding pots</li><li>Dried fruit, nuts and cereal bars</li><li>Bottled lemon juice, salt, pepper</li><li>A manual tin opener</li>
</ul>
<p>Add water: 3 litres per person per day. For 2 people for 3 days, that's 18 litres.</p>

<h2>Keeping it clean without running water</h2>
<ul>
<li>Wash your hands with soap and water before preparing food and after the toilet. If you can't, use hand gel.</li>
<li>Wipe the tin lid before opening it.</li>
<li>Use paper plates, or one bowl each that you wipe out.</li>
<li>If you can't wash fruit, peel it.</li>
</ul>
<p>Food safety when the fridge is off is in <a href="eating-safely-without-power.html">our guide to eating safely without power</a>.</p>
""",
sources=["beready", "beready_kit", "cmo_food", "cmo_water", "fsa_power"],
),

# ---------------------------------------------------------------- COLD FOOD SAFETY
dict(
slug="eating-safely-without-power", cat="food", mins=5, flag=None,
title="Eating safely when the fridge and cooker are off",
summary="How long your fridge and freezer stay cold, what to throw away, who should be extra careful, and how to cook safely if you can.",
body="""
<p class="lede">When the power goes off, the clock starts on what's in your fridge. Here's the official advice on what's safe, in plain numbers.</p>

<h2>Keep the doors shut</h2>
<p>A closed fridge stays cold for <b>up to about 4 hours</b>. A full freezer keeps food frozen for <b>about 48 hours</b>, or <b>about 24 hours</b> if it's half full. Every time you open the door, that time gets shorter. Decide what you want before you open it, and be quick.</p>

<h2>What to throw away</h2>
<ul>
<li>Chilled food should stay below <b>8°C</b>. If it's been above 8°C for <b>more than 4 hours</b>, throw it away.</li>
<li>A cheap fridge thermometer tells you for certain. Without one, if you can't be sure, throw it out.</li>
<li>Don't taste or sniff chilled food with a use-by date to check it. You can't see, smell or taste the bacteria that cause food poisoning.</li>
<li>If frozen food has thawed, treat it as chilled food and use it next.</li>
</ul>

<h2>Eat things in this order</h2>
<p>The UK Chief Medical Officers advise eating the food that spoils fastest first:</p>
<ol>
<li><b>Chilled food,</b> and frozen food as it defrosts.</li>
<li><b>Short-life food</b> such as pre-packed sandwiches and salads. These are safe for a day or two if they look and smell normal. Raw meat and fish are fine if you can cook them and they look and smell normal.</li>
<li><b>Fresh food that doesn't need a fridge,</b> like bread, cake, whole fruit and vegetables, and eggs.</li>
<li><b>Tins and packets last.</b> Food normally kept at room temperature is still safe after its best before date.</li>
</ol>
<p>Whole fruit and vegetables, hard cheese, yoghurt, butter, pasteurised milk, and long-life milk or juice (even once opened) are safe for <b>up to 7 days</b> if they look and smell normal. Pre-cut fruit and vegetables last 3 to 4 days, and are safe after that if cooked.</p>
<p><b>In cold weather (below 8°C),</b> you can keep food outside in a clean, dry, sealed plastic or metal container, out of direct sunlight and away from animals.</p>

<h2>Who should be extra careful</h2>
<p>After 4 hours without power, these people should <b>not</b> eat chilled ready-to-eat food (things like cooked meats, smoked fish, soft cheese, pâté, prepared salads and sandwiches) or leftovers:</p>
<ul>
<li>babies and young children</li>
<li>pregnant and breastfeeding women</li>
<li>older people</li>
<li>anyone with a weakened immune system, for example from cancer treatment</li>
</ul>
<p>Eat food from tins and packets instead. If there's no clean water for washing, peel fruit and vegetables. People with a severely weakened immune system shouldn't eat raw eggs.</p>
<p>Anyone being sick or with diarrhoea shouldn't prepare food for others. Wipe surfaces and utensils with antibacterial wipes if you can.</p>

<h2>If you can cook</h2>
<ul>
<li><b>A gas hob may still work</b> in a power cut, but the electric spark won't. Light it carefully with a long match or a gas lighter. A gas oven probably won't work. Check your cooker's instructions now, so you know. If you smell gas, turn it off and call 0800 111 999.</li>
<li><b>Camping stoves and barbecues are for outside only,</b> in a garden or open space. Never use them indoors, in a garage, a tent, or on a balcony. They give off carbon monoxide, which you can't see or smell and which can kill.</li>
<li>Cook food until it's <b>steaming hot</b> all the way through.</li>
</ul>

<h2>If you can't cook</h2>
<p>You don't need hot food to stay well for a few days. Tins, crackers, oats, long-life milk, fruit and peanut butter will do. See <a href="no-cook-meals.html">six no-cook meals from your cupboard</a>.</p>

<h2>Drink enough</h2>
<p>Everyone needs to drink <b>at least 2 litres a day</b>, about 8 cups. Store <b>3 litres per person per day</b>, so there's some for food and washing hands. Children under 2 who aren't breastfed need at least 1 litre a day, about 4 cups, and formula counts towards it. Avoid alcohol, because it dehydrates you. For babies, see <a href="feeding-a-baby.html">feeding a baby when the power or water fails</a>.</p>

<h2>Before it happens</h2>
<ol class="todo">
<li>Put a fridge thermometer in the fridge (about £3).</li>
<li>Keep your freezer reasonably full. Bottles of tap water fill gaps and help it stay cold.</li>
<li>Keep 3 days of food that needs no cooking or fridge.</li>
<li>If you have a gas hob, keep long matches next to it.</li>
</ol>
""",
sources=["fsa_power", "cmo_food", "fsa_dates", "ca_powercut", "nhs_co", "beready"],
),

# ---------------------------------------------------------------- POWER CUT
dict(
slug="power-cut", cat="power", mins=6, flag=None,
title="What to do in a power cut, hour by hour",
summary="The first 10 minutes, the first few hours and the first day. Who to call, what to unplug, and why your landline might stop working.",
body="""
<p class="lede">Most power cuts are over in a few hours. But storms can cut power to tens of thousands of homes for a day or more. Here's what to do, in order.</p>

<h2>The first 10 minutes</h2>
<ol class="todo">
<li><b>Is it just you?</b> Look at your neighbours' lights and the street lights. If theirs are on, check your fuse box: a tripped switch may be the cause.</li>
<li><b>Call 105.</b> It's free from any phone and puts you through to your local network operator. You can also check their website or social media for updates on your area.</li>
<li><b>Get your torch.</b> Use torches, not candles, because candles start fires. If a candle is all you have, put it in a proper holder, well away from curtains, never leave it, and blow it out before you sleep.</li>
<li><b>Unplug</b> things that could come on unexpectedly when the power returns, like a cooker, heater or iron, and sensitive things like the TV and computer. Leave one light switched on so you know when it's back.</li>
<li><b>Keep the fridge and freezer shut.</b></li>
</ol>

<h2>The first few hours</h2>
<ul>
<li><b>Save your phone battery.</b> Turn on low-power mode, close apps and lower the screen brightness. Use a power bank if you have one.</li>
<li><b>Your landline may not work.</b> Most home phones now run through the broadband router, which needs mains power. Providers must offer a backup solution that keeps emergency calls working for at least an hour to customers who rely on their landline, such as people with no mobile signal or with telecare alarms. If that's you or someone you look after, ask your provider about it now. The old copper phone network, which kept working in power cuts, is due to be switched off on 31 January 2027.</li>
<li><b>Mobile signal can drop</b> in a long power cut, as masts run out of battery. Agree with your household where you'll meet and who checks on whom, in case you can't call.</li>
<li><b>Turn on a battery or wind-up radio.</b> In a big power cut, official health advice goes out on BBC Radio 2 and Radio 4, and local news on BBC local radio. Use FM: Radio 4 stopped broadcasting on long wave in June 2026. Keep a pen and paper by the radio to write the advice down. See <a href="emergency-radio.html">which radio to keep</a>.</li>
<li><b>Check on neighbours</b> who live alone, are older, or rely on medical equipment.</li>
</ul>

<h2>After about 4 hours</h2>
<ul>
<li>Food in the fridge may no longer be safe. See <a href="eating-safely-without-power.html">eating safely when the fridge is off</a>.</li>
<li>If it's cold, choose one room to live in and start <a href="keeping-warm.html">keeping warm</a> before you feel cold.</li>
<li>Take medicines at the usual times. If any need the fridge, see <a href="medicines-and-equipment.html">fridge medicines and medical equipment</a>.</li>
</ul>

<h2>If it lasts a day or more</h2>
<ul>
<li>Use your stored water and no-cook food.</li>
<li>Never bring a barbecue, camping stove, outdoor heater or generator indoors.</li>
<li>If you're on the Priority Services Register, your network operator may contact you or offer extra help. If you need help and aren't registered, tell them when you call 105.</li>
<li>Follow official advice on the radio and from your council.</li>
</ul>

<h2>When the power comes back</h2>
<ul>
<li>Plug things back in one at a time.</li>
<li>Don't leave e-bike, e-scooter or other big batteries charging while you sleep or go out, and use the charger that came with them.</li>
<li>Check the fridge and freezer before eating anything from them.</li>
<li>Reset clocks, timers and the boiler if it needs it.</li>
<li>Recharge torches, power banks and phones, and replace anything you used.</li>
</ul>

""" + NUMBERS,
sources=["beready", "beready_power", "ca_powercut", "fire_home", "dwfire", "fsa_power", "ofcom_power", "cmo_all", "bbc_black", "psr"],
),

# ---------------------------------------------------------------- NO WATER
dict(
slug="no-water", cat="water", mins=5, flag=None,
title="When the water goes off, or isn't safe to drink",
summary="What the different water notices mean, how much to store, and how to manage toilets and washing without running water.",
body="""
<p class="lede">Burst mains, droughts and contamination can leave homes without safe tap water for days. The answer is mostly water you've already stored, and knowing what the notices mean.</p>

<h2>How much to store</h2>
<p>The government asks every home to keep enough water for 3 days. Plan on <b>3 litres per person per day</b> for drinking and basic food preparation. That's 9 litres for one person, 18 for two, 36 for a family of four. More for pets, babies on powder formula, or hot weather.</p>
<p>Bottled water is easiest. Keep it somewhere cool and dark, and check the dates once a season.</p>

<h2>What the notices mean</h2>
<p>Your water company will tell you which notice applies. Always follow the notice they give you. Broadly:</p>
<ul>
<li><b>Boil water notice:</b> the water is safe once boiled. Boil it and let it cool before drinking, brushing teeth, preparing food, making ice, cleaning a baby's feeding equipment or giving it to pets. You can still wash and flush the toilet as normal.</li>
<li><b>Do not drink notice:</b> don't drink it, cook with it or brush your teeth with it, even if you boil it. Use bottled water. Your notice will say what else you can still use it for.</li>
<li><b>Do not use notice:</b> don't use tap water at all, unless your notice says you can flush the toilet with it.</li>
</ul>
<p>Babies need special care. See <a href="feeding-a-baby.html">feeding a baby when the water fails</a>.</p>

<h2>Toilets</h2>
<p>What to do depends on whether the sewers are still working.</p>
<ul>
<li><b>If only your water is off</b>, as in a burst main, the sewers usually still work. Flush by pouring a bucket of water quickly into the bowl. Use bath water or water that isn't safe to drink, never your stored drinking water.</li>
<li><b>If there's a national power cut</b>, or you're told the sewers aren't working, <b>don't flush at all</b>. Line the toilet bowl with a strong bin bag, use it, seal it and put it in your normal household waste, ideally an outside bin. Then wash your hands. This is the UK Chief Medical Officers' advice.</li>
</ul>
<p>Keep a roll of strong bin bags for this.</p>

<h2>Washing hands</h2>
<p>Save most of your water for drinking, but keep some for washing hands after the toilet and before preparing food. The Chief Medical Officers advise this:</p>
<ul>
<li>Fill a washing-up bowl with water and add soap or household disinfectant. The whole household shares it for the whole time the water is off, even when it stops looking clean.</li>
<li>Anyone with diarrhoea uses a separate bowl.</li>
<li>Soap and water kills germs better than hand sanitiser. Use sanitiser only if there's nothing else.</li>
<li>Don't use water for showers or baths.</li>
<li>Use paper plates and cups to save washing up.</li>
</ul>

<h2>If the bottled water runs out</h2>
<p>Water from rain, a water butt or a lake can be made safe to drink, but it takes care. See <a href="making-water-safe.html">making water safe to drink</a>.</p>

<h2>Bottled water stations</h2>
<p>In a long outage, water companies often set up bottled water stations. Queues can be long, and carrying water is hard for older and disabled people. If you're on your water company's <a href="priority-services-register.html">Priority Services Register</a>, they may deliver water to you instead. You have to join your water company's register separately from the energy one.</p>

<h2>Sort these out now</h2>
<ol class="todo">
<li>Buy 3 days of bottled water for everyone at home.</li>
<li>Find your stopcock, so you can turn off the water if a pipe bursts.</li>
<li>Keep strong bin bags, a washing-up bowl and soap.</li>
<li>If you'd struggle to collect water, join your water company's Priority Services Register.</li>
</ol>
""",
sources=["beready", "beready_water", "dwi_boil", "cmo_water", "uu_psr", "fsa_formula"],
),

# ---------------------------------------------------------------- KEEPING WARM
dict(
slug="keeping-warm", cat="power", mins=5, flag=None,
title="Keeping warm when the heating stops",
summary="Most boilers need electricity, even gas ones. How to keep a home warm for days, the signs of getting too cold, and the carbon monoxide danger.",
body="""
<p class="lede">Even a gas boiler needs electricity to run. In a winter power cut, the house cools quickly. Cold is dangerous for older people, babies and anyone with a heart or lung condition, so start keeping warm before anyone feels cold.</p>

<h2>Make one warm room</h2>
<ul>
<li>Choose one room for everyone to spend time in. A smaller room, away from outside walls, holds heat best.</li>
<li>Close the door and curtains, and block draughts under the door with a rolled-up towel.</li>
<li>Close doors and windows in the rooms you're not using.</li>
<li>No curtains? Hang a blanket or sheet over the window.</li>
</ul>

<h2>Keep bodies warm</h2>
<ul>
<li>Wear several thin layers rather than one thick one. Add hats, gloves, thick socks and slippers.</li>
<li>Use blankets, sleeping bags and duvets, even during the day.</li>
<li>Eat regularly and have warm drinks if you can heat water safely.</li>
<li>Get up, move around and stretch at least once an hour if you're able.</li>
<li>When sitting, keep your feet up off the floor, where the air is coldest.</li>
<li>Babies need to be warm, but not hot. Dress them in layers you can adjust. Take hats off indoors and for sleep. If they feel cold, add a layer of clothing or a lightweight blanket, not a duvet or thick blanket. Feel their chest or the back of their neck to check: hands and feet are often cool. Never put a hot water bottle in a cot.</li>
</ul>

<h2>The carbon monoxide danger</h2>
<p>When people are cold, they bring in things to heat the house: a barbecue, a camping stove, a patio heater, or a generator. All of these give off <b>carbon monoxide</b>. You can't see, smell or taste it, and it can kill quickly and without warning.</p>
<ul>
<li><b>Never</b> use barbecues, camping stoves, outdoor heaters or generators indoors, in a garage, or on a balcony.</li>
<li>Never use a gas oven or hob to heat the room.</li>
<li>Only light a fire indoors in a proper fireplace with a working chimney, or a stove made for it. Burn only the right fuel: never old furniture, pallets, fence panels, rubbish, petrol or lighter fluid.</li>
<li>A generator goes outside, at least 6 metres (20 feet) from the house, with the exhaust pointing away from windows and doors.</li>
<li>Never leave a fire, heater or generator unattended, and keep a fire extinguisher nearby.</li>
<li>Fit a carbon monoxide alarm in any room with a gas, oil, coal or wood appliance.</li>
<li>Signs of carbon monoxide poisoning include a headache, dizziness, feeling sick, tiredness and confusion, often in more than one person at once. If you suspect it, stop using the appliance, get into fresh air, and call 0800 111 999 for a gas appliance. Call 999 if someone is struggling to breathe, confused or collapses. Otherwise call 111 for advice, even if you feel better outside.</li>
</ul>

<h2>Signs of hypothermia</h2>
<p>The Chief Medical Officers list these signs:</p>
<ul>
<li>shivering</li>
<li>cold, dry skin</li>
<li>blue or grey skin or lips (on black or brown skin, look at the palms and soles)</li>
<li>slurred speech, slow breathing, and tiredness or confusion</li>
</ul>
<p><b>A baby</b> with hypothermia may be cold to touch, floppy, unusually quiet and sleepy, and may refuse to feed.</p>
<h2>What to do</h2>
<ol>
<li>Get them indoors or somewhere sheltered.</li>
<li>Take off any wet clothes. Wrap them in a blanket, sleeping bag or dry towel, covering their head.</li>
<li>If they're awake, give them something sugary, like chocolate, and a warm drink that isn't alcohol.</li>
<li>Stay with them and keep them talking.</li>
<li><b>Call 999.</b> Hypothermia is an emergency.</li>
<li>Don't use a hot bath, hot water bottle or heat lamp to warm them, and don't rub their arms, legs, hands or feet.</li>
</ol>

<h2>Sort these out before winter</h2>
<ol class="todo">
<li>Keep enough blankets or sleeping bags for everyone.</li>
<li>Keep hats, gloves and warm socks together where you can find them in the dark.</li>
<li>Fit a carbon monoxide alarm if you have any fuel-burning appliance.</li>
<li>Keep a torch and spare batteries in the room you'll use.</li>
<li>Check on older neighbours and relatives when a cold spell is forecast. See <a href="checking-on-someone.html">checking on someone</a>.</li>
</ol>
""",
sources=["cmo_warm", "nhs_hypo", "nhs_co", "cadent_co", "lullaby", "lullaby_em", "beready", "alarms"],
),

# ---------------------------------------------------------------- BABY
dict(
slug="feeding-a-baby", cat="people", mins=6, flag="clinical",
title="Feeding a baby when the power or water fails",
summary="Breastfeeding, ready-made formula, powder formula and sterilising. What to keep in, and what the official guidance says about bottled water.",
body="""
<p class="lede">Babies can't wait, and powder formula needs water at a temperature you may not be able to reach in a power cut. A small stock of the right things removes most of the worry.</p>

<h2>If you're breastfeeding</h2>
<p>Breastfeeding needs no power, water or equipment. Keep feeding whenever your baby asks, as usual, and drink plenty yourself. Breastfeeding women should also avoid chilled ready-to-eat food and leftovers after 4 hours without power.</p>

<h2>Ready-made formula is the easiest backup</h2>
<p>Ready-to-feed liquid formula comes sterile in a carton or bottle and needs no water or heating. Keep 3 days' worth at home, plus a supply of single-use pre-sterilised bottles or teats, and rotate it before it goes out of date.</p>
<ul>
<li>Work out 3 days: the number of feeds your baby has a day, times the amount per feed, times 3.</li>
<li>Once opened, follow the storage instructions on the pack. Without a fridge, use an opened carton straight away.</li>
<li>Throw away any milk left in the bottle at the end of a feed.</li>
</ul>

<h2>If you use powder formula</h2>
<p>The NHS says to make up powder formula with <b>freshly boiled tap water that's still at least 70°C</b>, which means using it within 30 minutes of boiling. Hot water kills bacteria that can be in the powder.</p>
<ul>
<li>A <b>gas hob</b> may still work in a power cut. Light it with a long match, following the cooker's instructions.</li>
<li>A camping stove is fine <b>outside only</b>, never indoors or on a balcony.</li>
<li>If you get warning of a power cut, fill a clean vacuum flask with just-boiled water and seal it. The NHS says a full, sealed flask keeps water above 70°C for several hours. Keep the flask only for your baby.</li>
</ul>

<h2>If the tap water is off or not safe</h2>
<p>Bottled water isn't usually recommended for formula, because some contains too much salt (sodium) or sulphate. If your tap water is off or unsafe, the Food Standards Agency's guidance (November 2026) says:</p>
<ul>
<li><b>Ready-made formula is the safest choice.</b></li>
<li>If you must use powder, use <b>still</b> bottled water with the lowest sodium you can find. On the label, sodium (Na) should be under 200mg a litre and sulphate (SO4) under 250mg a litre. Don't use water labelled as not suitable for infants.</li>
<li>Bottled water isn't sterile. <b>Boil it first,</b> and use it within 30 minutes, the same as tap water.</li>
<li>Don't wash or rinse bottles and teats in tap water that isn't safe. Use bottled water.</li>
</ul>
<p><a href="https://www.gov.uk/government/publications/preparing-infant-formula-safely-during-water-supply-disruptions-and-when-travelling" target="_blank" rel="noopener">Read the full FSA guidance</a>. During a boil water or do not drink notice, your water company will also give advice for babies.</p>

<h2>In a national power cut</h2>
<p>The UK Chief Medical Officers' radio advice for a national power cut says that children under 2 who aren't breastfed need at least 1 litre of fluid a day (about 4 cups), and formula counts towards this. Keep to the usual feeding schedule. Wash bottles, give them a final rinse with a little of your cleanest water, and make up formula with more of that cleanest water. This is a last resort: ready-made formula and single-use pre-sterilised bottles are safer. Listen to the radio for updated advice.</p>

<h2>Sterilising</h2>
<ul>
<li>Single-use pre-sterilised bottles avoid the problem entirely.</li>
<li>Cold-water sterilising tablets or liquid work without power, but need clean water.</li>
<li>Steam sterilisers and microwave sterilisers need power.</li>
</ul>

<h2>Keep baby warm, fed and changed</h2>
<ul>
<li>Keep 3 days of nappies and wipes.</li>
<li>Dress your baby in layers you can add or remove. Take hats off indoors and for sleep, and use a lightweight blanket, not a duvet.</li>
<li>If your baby is feeding less, is very sleepy, has fewer wet nappies or seems unwell, call 111. Call 999 in an emergency.</li>
</ul>

<h2>Sort these out now</h2>
<ol class="todo">
<li>Buy 3 days of ready-to-feed formula, if you use formula.</li>
<li>Buy a pack of pre-sterilised single-use bottles.</li>
<li>Read the FSA guidance on bottled water for formula, so you know what to look for.</li>
<li>Keep 3 days of nappies and wipes.</li>
<li>Join the Priority Services Register. Families with children under 5 can usually join.</li>
</ol>
""",
sources=["nhs_feed", "nhs_flask", "nhs_use", "fsa_formula", "cmo_water", "cmo_food", "lullaby", "ofgem_psr"],
),

# ---------------------------------------------------------------- MEDICINES
dict(
slug="medicines-and-equipment", cat="people", mins=5, flag="clinical",
title="Fridge medicines and powered medical equipment",
summary="Insulin and other fridge medicines, oxygen concentrators, hoists and air mattresses. The questions to ask your pharmacist and supplier now.",
body="""
<p class="lede">If someone at home relies on a medicine kept in the fridge, or equipment that runs on mains power, a power cut is more than an inconvenience. Most of the planning is a few phone calls, made now.</p>

<h2>Medicines kept in the fridge</h2>
<p>Common examples include insulin, some eye drops, some injections and some liquid antibiotics. How long each one can safely stay out of the fridge varies a lot.</p>
<p><b>Ask your pharmacist</b>, for each fridge medicine:</p>
<ul>
<li>How long can it stay at room temperature and still work?</li>
<li>What should I do with it if the fridge is off for longer?</li>
<li>Can I get a cool bag or travel case for it?</li>
</ul>
<p>Write the answers down and keep them with the medicine. The leaflet in the box often says too.</p>
<ul>
<li>In a power cut, keep the fridge shut, and take the medicine out only when you need it.</li>
<li>Most fridge medicines must not freeze: check the leaflet. If you use ice packs, wrap them so they don't touch the medicine.</li>
<li>Keep taking medicines at the usual times. If a dose is missed or a medicine may have spoiled, ask a pharmacist or call 111.</li>
</ul>

<h2>Equipment that needs power</h2>
<p>This includes oxygen concentrators, home dialysis, ventilators and suction machines, feeding pumps, hoists and stairlifts, electric profiling beds, and pressure-relief air mattresses.</p>
<p><b>Ask your equipment supplier:</b></p>
<ul>
<li>Does it have a backup battery, and how long does it last?</li>
<li>What should we do if the power is off for longer than that? (For oxygen, ask about backup cylinders.)</li>
<li>For a hoist or bed: can it be lowered or moved by hand?</li>
<li>For an air mattress: what happens to it without power, and what should we do?</li>
<li>What's your 24-hour number?</li>
</ul>

<h2>Get on the Priority Services Register</h2>
<p>If you rely on medical equipment or fridge medicines, you can join your energy and water companies' <a href="priority-services-register.html">Priority Services Register</a> for free. They'll know about you during a cut, and may give you advance warning of planned ones.</p>

<h2>If life is at risk</h2>
<p>If equipment fails and someone's breathing or life is at risk, call 999. Don't wait for the power to come back.</p>

<h2>Sort these out now</h2>
<ol class="todo">
<li>Ask the pharmacist how long each fridge medicine can be out of the fridge. Write it down.</li>
<li>Ask each equipment supplier the questions above, and save their 24-hour number on paper.</li>
<li>Don't run low. Order repeat prescriptions in good time, about a week before they run out, so there are always a few days in hand. Keep a written list of each medicine and its dose.</li>
<li>Charge any backup batteries and power banks.</li>
<li>Join the Priority Services Register.</li>
</ol>
""",
sources=["beready_kit", "beready_power", "iddt", "ca_powercut", "ofgem_psr", "psr", "enwl_psr"],
),

# ---------------------------------------------------------------- CHECKING ON SOMEONE
dict(
slug="checking-on-someone", cat="people", mins=5, flag=None,
title="Checking on an older relative or neighbour",
summary="What to look at on your next visit, a 10-minute chat to have, and how to keep in touch if the phones go down.",
body="""
<p class="lede">Older people living alone are often the most at risk in a power cut or cold spell, and the least likely to have a plan. You can make a big difference on your next visit.</p>

<h2>Look round on your next visit</h2>
<ul>
<li><b>Water:</b> is there bottled water in the house, about 9 litres for one person for 3 days?</li>
<li><b>Food:</b> is there food that doesn't need cooking or a fridge?</li>
<li><b>Light:</b> is there a working torch they can reach from the bed and the chair? Do they have spare batteries? Are they using candles?</li>
<li><b>Warmth:</b> are there blankets, a hat and warm layers where they can find them?</li>
<li><b>Medicines:</b> do they have a few days' supply? Does any need the fridge?</li>
<li><b>Phone:</b> is their mobile charged? Does their landline or care alarm work in a power cut? Many don't.</li>
<li><b>Alarms:</b> do the smoke alarms and carbon monoxide alarm work? Press the test button.</li>
</ul>

<h2>A 10-minute chat</h2>
<p>Keep it calm and practical, not frightening. You might start with: "There's been a lot in the news about power cuts. If yours went off, what would you do?" Then agree:</p>
<ul>
<li>who will check on them, and how (call, text or knock)</li>
<li>a neighbour who can look in if you can't get there</li>
<li>where a spare key is, or whether they have a key safe</li>
<li>what they'd do if they had to leave the house, and where they'd go</li>
</ul>

<h2>If the phones go down</h2>
<p>In a long power cut, landlines and mobile signal can fail. Agree in advance: "If I can't reach you, I'll come round by" a certain time, or a neighbour will. Write it down for them.</p>

<h2>Get them on the Priority Services Register</h2>
<p>People of pension age can usually join their energy and water companies' <a href="priority-services-register.html">Priority Services Register</a>. It's free and you can do it for them with their permission. It takes about 10 minutes.</p>

<h2>Make them a plan</h2>
<p>Fettle's free check works for someone else too. Answer the questions about their home, and you'll get a plan and shopping list for their house. You can do it together on your next visit.</p>
""",
sources=["beready", "psr", "ofcom_power", "survey"],
),

# ---------------------------------------------------------------- RENTING
dict(
slug="renting", cat="home", mins=4, flag=None,
title="Renting: what your landlord must do, and what you can do",
summary="Smoke and carbon monoxide alarm rules, gas and electrical safety checks, and the questions to ask. For tenants in England.",
body="""
<p class="lede">If you rent, some of your safety is your landlord's job. Here's what the law says in England, and what you can sort out yourself. The rules are different in Wales, Scotland and Northern Ireland.</p>

<h2>Alarms: your landlord must fit them</h2>
<p>Since 1 October 2022, private and social landlords in England must:</p>
<ul>
<li>fit a <b>smoke alarm on every storey</b> of your home that has a room used as living accommodation</li>
<li>fit a <b>carbon monoxide alarm in any room with a fixed fuel-burning appliance</b>, such as a gas boiler or wood burner (gas cookers are excluded)</li>
<li>repair or replace an alarm once you tell them it's faulty</li>
</ul>
<p>Test your alarms once a month by pressing the button. If one doesn't work, tell your landlord in writing, such as by email, and keep a copy.</p>

<h2>Gas and electrical safety</h2>
<ul>
<li>If you have gas, your landlord must have the appliances checked every year by a Gas Safe registered engineer and give you a copy of the record.</li>
<li>Private and social landlords must have the electrics inspected and tested at least every 5 years, and give you a copy of the report. For council and housing association tenancies that began before 1 December 2025, the first check is due by 1 November 2026.</li>
</ul>

<h2>Ask your landlord</h2>
<ul>
<li>Where is the stopcock, and the fuse box?</li>
<li>If I live in a block: what is the fire strategy, and what does the main door do in a power cut?</li>
<li>Who do I call for an emergency repair out of hours?</li>
</ul>

<h2>What you can do yourself</h2>
<ul>
<li>Keep 3 days of water and food that needs no cooking. It's yours and takes little space.</li>
<li>Get contents insurance. Your landlord's insurance doesn't cover your belongings.</li>
<li>Keep a torch, a power bank and a battery radio.</li>
<li>Plan two ways out in a fire, and keep door keys where everyone can find them. In a fire: get out, stay out and call 999.</li>
<li>Join the <a href="priority-services-register.html">Priority Services Register</a> if you're eligible. You don't need your landlord's permission.</li>
<li>If you live in a flat, read <a href="high-rise-flats.html">living in a high-rise flat</a>.</li>
</ul>
""",
sources=["alarms", "elec", "fire_home", "gmfrs_stay", "beready"],
),

# ---------------------------------------------------------------- GRAB BAG
dict(
slug="grab-bag", cat="start", mins=4, flag=None,
title="Packing a grab bag",
summary="If you had to leave home in a hurry because of a flood or fire, what would you take? A list you can pack in an afternoon.",
body="""
<p class="lede">Only about 1 in 5 people have a bag ready to grab if they had to leave in a hurry. You don't need a special kit. A rucksack and things from around the house will do.</p>

<h2>The list</h2>
<ul class="check">
<li>Torch and spare batteries, or a wind-up torch</li>
<li>Phone charger and a charged power bank</li>
<li>Copies of ID, insurance documents and prescriptions, in a plastic wallet</li>
<li>Some cash, about £10 per person</li>
<li>Spare house and car keys</li>
<li>Your regular medicines, and a list of them with the doses</li>
<li>Glasses, contact lenses and hearing aid batteries</li>
<li>A small first aid kit, hand sanitiser and wipes</li>
<li>Bottled water and long-life snacks</li>
<li>Warm layers, hats, gloves and a foil blanket</li>
<li>A notepad, a pen and a whistle</li>
<li>A list of important phone numbers, on paper</li>
</ul>

<h2>Add if you need them</h2>
<ul class="check">
<li><b>Babies:</b> nappies, wipes, ready-made formula and a change of clothes</li>
<li><b>Pets:</b> food, a lead or carrier, and any pet medicines</li>
<li><b>Medical equipment:</b> chargers, batteries and the supplier's 24-hour number</li>
<li><b>Children:</b> a small toy or book</li>
</ul>

<h2>Where to keep it</h2>
<p>By the front door or in a cupboard near it, where everyone at home knows it is. Tell them.</p>
<p>Check it every season: replace food and water before the dates, charge the power bank, and update medicines.</p>

<h2>Where would you go?</h2>
<p>Agree two places with your household: one nearby, like a neighbour's, and one further away, like a relative's in another town. Write down the addresses.</p>
""",
sources=["beready", "beready_kit", "survey", "redcross"],
),

# ---------------------------------------------------------------- PSR
dict(
slug="priority-services-register", cat="start", mins=4, flag=None,
title="Join the Priority Services Register in 10 minutes",
summary="A free list kept by power and water companies of people who need extra help. Who can join, what you get, and the numbers to call in the North West.",
body="""
<p class="lede">The Priority Services Register is a free list kept by your energy and water companies of people who need extra help during a power or water cut. It's one of the most useful 10 minutes you can spend.</p>

<h2>Who can join</h2>
<p>You can usually join if anyone in your home:</p>
<ul>
<li>is of pension age</li>
<li>is disabled or has a long-term health condition</li>
<li>relies on medical equipment that needs power, or medicine kept in the fridge</li>
<li>has a child under 5</li>
<li>is pregnant</li>
<li>has a sight, hearing or mental health condition</li>
<li>doesn't speak or read English well</li>
<li>needs extra help for a short time, for example after an operation</li>
</ul>

<h2>What you might get</h2>
<ul>
<li>Advance warning of planned power cuts</li>
<li>Priority support and updates during an unplanned cut</li>
<li>Bottled water delivered to your door during a water outage</li>
<li>A password scheme, so you know a caller is genuine</li>
<li>Bills and letters in large print, Braille or another format</li>
</ul>

<h2>How to join</h2>
<p>There are two registers. You need to join both.</p>
<ol class="todo">
<li><b>Energy:</b> contact your energy supplier (the company that bills you) or your local electricity network operator. In the North West, that's Electricity North West: <b>0800 195 4141</b>, or online at <a href="https://www.enwl.co.uk/priority" target="_blank" rel="noopener">enwl.co.uk/priority</a>. Other areas: <a href="https://www.thepsr.co.uk" target="_blank" rel="noopener">thepsr.co.uk</a>.</li>
<li><b>Water:</b> contact your water company. In the North West, United Utilities: <b>0345 672 2888</b>, or <a href="https://www.unitedutilities.com/priorityservices" target="_blank" rel="noopener">unitedutilities.com/priorityservices</a>.</li>
</ol>
<p>You can join on behalf of someone else, such as a parent, with their permission. Have their address, date of birth and the reason ready.</p>
<p>Re-check every couple of years, or when things change, like a new baby or new equipment.</p>
""",
sources=["ofgem_psr", "psr", "enwl_psr", "uu_psr"],
),
# ---------------------------------------------------------------- TIGHT BUDGET
dict(
slug="tight-budget", cat="help", mins=5, flag="advice",
title="Getting ready when money is tight",
summary="You don't need to spend much, or anything, to be safer. What to do for free, what to do for a pound or two, and where to get help.",
body="""
<p class="lede">Most advice about emergencies assumes you can go out and buy things. Lots of people can't. Being ready is mostly about knowing what to do, not what you own. Start with the free things. They matter most.</p>

<h2>Free, and worth the most</h2>
<ol class="todo">
<li><b>Join the <a href="priority-services-register.html">Priority Services Register</a></b> if you're older, disabled, have a health condition or have young children. It's free, and you get extra help in a power or water cut.</li>
<li><b>Write five phone numbers on paper.</b> If your phone dies or you have no credit, you can still borrow a phone.</li>
<li><b>Agree where you'd go</b> if you had to leave home, and who you'd tell.</li>
<li><b>Test your smoke alarm.</b> No alarm, or it doesn't work? Many fire and rescue services fit them free on a home visit. If you rent, your landlord must fit one.</li>
<li><b>Wash 2 or 3 empty drinks bottles and keep them.</b> If you're warned the water may go off, fill them from the tap straight away.</li>
<li><b>Know your neighbours' names.</b> In every real emergency, neighbours help first.</li>
</ol>

<h2>For a pound or two at a time</h2>
<ul>
<li><b>Food:</b> add one extra tin of something you already eat to each shop. Beans, soup, fish, fruit. Choose ring-pull tins if you don't have a tin opener.</li>
<li><b>Light:</b> a basic torch from a supermarket or pound shop. Don't use candles: they cause fires in power cuts.</li>
<li><b>Warmth:</b> you already have it. Duvets, coats, hats and thick socks. Charity shops sell blankets cheaply.</li>
</ul>
<p>You don't have to do it all at once. One small thing a week adds up.</p>

<h2>If you use a food bank</h2>
<ul>
<li>Ask if they have food that needs no cooking, and say if you have no tin opener or no way to heat food.</li>
<li>If your parcel has a few tins you can eat cold, try to keep one or two back when you can. Don't go hungry to do it.</li>
<li>Ask what else they can help with. Many give fuel vouchers for prepayment meters, toiletries and baby items.</li>
</ul>

<h2>You may be owed help</h2>
<p>Read <a href="help-you-can-get.html">help you can get</a>: emergency money from your council, credit for a prepayment meter, payments after a long power cut, and free alarms.</p>

<div class="tip"><b>You are not less safe because you have less money.</b> A neighbour who'll knock on your door is worth more than a cupboard full of kit.</div>
""",
sources=["beready", "survey_sd", "ofgem_psr", "ca_prepay"],
),

# ---------------------------------------------------------------- PREPAYMENT
dict(
slug="prepayment-meters", cat="help", mins=4, flag="advice",
title="Prepayment meters: staying on when the weather turns",
summary="Emergency credit, friendly hours, what to do if you can't top up, and why to top up before a storm.",
body="""
<p class="lede">If you top up a meter, a storm can cut you off twice: once when the power goes, and again if you can't get to a shop or your credit runs out. A little planning stops the second one.</p>

<h2>Before bad weather</h2>
<ul>
<li><b>Top up when a weather warning comes,</b> if you can. Shops may shut, card machines may be down, and you may not be able to get out.</li>
<li><b>Know how to turn on your emergency credit.</b> It's usually about £10. On a smart meter it's on the in-home display. You pay it back on your next top-up.</li>
<li><b>Keep your key or card somewhere you'll find it in the dark.</b></li>
</ul>

<h2>If you can't top up</h2>
<ol class="todo">
<li><b>Use your emergency credit.</b></li>
<li><b>Check for friendly hours.</b> Many meters won't cut off at night, at weekends or on bank holidays, even at zero. Ask your supplier which hours yours covers.</li>
<li><b>Phone your supplier and say you can't top up.</b> If you're disabled, have a health condition, are over State Pension age, are pregnant, have a child under 5, or are struggling with living costs, they may give you <b>additional support credit</b>. Ask for it by name.</li>
<li><b>Ask for a fuel voucher.</b> Your council, your supplier and many food banks give them. You use the code at a PayPoint or Payzone shop or a Post Office. Check the expiry date: it can be as short as 15 days.</li>
</ol>
<p>If a prepayment meter isn't safe for you, for example you're 75 or over and live alone, have a child under 2, or are disabled, ask your supplier to move you off prepayment.</p>

<h2>After a power cut</h2>
<p>When the power comes back, check your meter has come back on too. If it hasn't, phone your supplier. If you're owed a <a href="help-you-can-get.html">payment for a long power cut</a>, ask your supplier how it will reach you.</p>

<h2>If you owe money on the meter</h2>
<p>Part of every top-up goes to the debt. If that leaves you without heating, ask your supplier to lower the repayments. They must consider what you can afford.</p>
""",
sources=["ca_prepay", "ofgem_cut", "beready_power"],
),

# ---------------------------------------------------------------- HELP YOU CAN GET
dict(
slug="help-you-can-get", cat="help", mins=6, flag="advice",
title="Help you can get: money, credit and free safety equipment",
summary="Emergency money from your council, help with a prepayment meter, payments after a long power cut, free alarms and the Priority Services Register.",
body="""
<p class="lede">There is more help than most people know about. None of it means you've failed. It's there to be used.</p>

<h2>Emergency money for essentials</h2>
<ul>
<li><b>England:</b> your council runs the <b>Crisis and Resilience Fund</b>. It started on 1 April 2026 and took over from the Household Support Fund. Where there is a county council, the county runs it. It can help with food, energy and essentials in a crisis, often as cash. Each council runs it its own way: search for your council's name and "Crisis and Resilience Fund", or phone them.</li>
<li><b>Scotland:</b> a <b>crisis grant</b> from the Scottish Welfare Fund. Apply through your council.</li>
<li><b>Wales:</b> an <b>emergency assistance payment</b> from the Discretionary Assistance Fund. Apply through the Welsh Government.</li>
<li><b>Northern Ireland:</b> <b>discretionary support</b> from the Finance Support Service.</li>
</ul>
<p>Not sure where to start? Citizens Advice can tell you what you can apply for.</p>

<h2>Gas and electricity</h2>
<ul>
<li><b>On a prepayment meter:</b> emergency credit, friendly hours, additional support credit and fuel vouchers. See <a href="prepayment-meters.html">prepayment meters</a>.</li>
<li><b>Behind on bills:</b> tell your supplier. They must work out a payment plan you can afford.</li>
</ul>

<h2>Payments after a long power cut</h2>
<p>You can get a payment from your electricity network if your power is off for a long time. Most are paid automatically.</p>
<ul>
<li><b>In normal weather:</b> £100 if you're off for more than 12 hours (more than 24 hours for a big power cut affecting 5,000 homes or more), then £45 for each extra 12 hours.</li>
<li><b>After a storm:</b> £90 once you've been off for 24 hours, or 48 hours for the worst storms, then £45 for every 6 hours after that.</li>
<li><b>If you're cut off a lot:</b> £100 if your power goes off more than 4 times in a year for 3 hours or more each time. You have to claim this one from your network.</li>
</ul>
<p>If you think you're owed a payment and nothing has come, contact your network operator. Being on the Priority Services Register doesn't give you a bigger payment, but it does get you extra help during the cut.</p>

<h2>Free safety equipment and help</h2>
<ul>
<li><b>Smoke alarms:</b> many fire and rescue services fit them free on a home fire safety visit. Ask yours.</li>
<li><b>If you rent:</b> your landlord must fit and repair alarms. See <a href="renting.html">renting</a> and <a href="social-housing.html">social housing and temporary accommodation</a>.</li>
<li><b>The <a href="priority-services-register.html">Priority Services Register</a>:</b> free, and it gets you updates and practical help in a power or water cut.</li>
</ul>

<h2>Babies and young children</h2>
<ul>
<li><b>Healthy Start</b> (England, Wales and Northern Ireland) and <b>Best Start Foods</b> (Scotland) help pay for milk, infant formula, fruit and vegetables if you're pregnant or have a young child and get certain benefits. Ask your midwife or health visitor.</li>
<li><b>Baby banks</b> give nappies and essentials free. Your health visitor can refer you.</li>
</ul>

<h2>Water</h2>
<p>If you struggle to pay your water bill, ask your water company about its cheaper tariff for people on a low income. In England and Wales, every company has one.</p>
""",
sources=["crf_gov", "crf", "nations", "ca_prepay", "ofgem_cut", "ofgem_psr", "fire_home"],
),

# ---------------------------------------------------------------- SOCIAL HOUSING
dict(
slug="social-housing", cat="help", mins=6, flag="advice",
title="Social housing and temporary accommodation",
summary="What your council or housing association must fix and how fast, getting out of a tall building if you're disabled, and staying safe in a hostel, B&B or shared house.",
body="""
<p class="lede">If your home belongs to a council, a housing association or someone else, a lot of your safety depends on them. Here's what you can ask for. The law described here is for England.</p>

<h2>If you rent from a council or housing association</h2>
<p>Since 27 October 2025, Awaab's Law sets time limits for social landlords in England.</p>
<ul>
<li><b>Emergencies: 24 hours.</b> If something is an immediate danger, such as a gas leak, a broken boiler, no water at all, dangerous electrics or a serious leak, your landlord must look into it and make it safe within 24 hours.</li>
<li><b>Serious damp and mould:</b> they must investigate within 10 working days, tell you in writing what they found within 3 working days, and make it safe within 5 working days of finishing the investigation.</li>
<li><b>If they can't make it safe in time,</b> they must offer you somewhere suitable to stay, at their cost, until the work is done.</li>
</ul>
<p>Report problems in writing if you can, by email or text, and keep a copy. Say clearly if someone at home is ill, very young or elderly. </p>
<p>From 30 November 2026, the same time limits cover more hazards, including homes that are too cold or too hot, fire and electrical safety, falls, and problems that make it hard to keep clean or prepare food safely.</p>
<p>If nothing happens, use your landlord's complaints process. If that doesn't fix it, the Housing Ombudsman is free: 0300 111 3000.</p>
<p><b>In temporary or supported accommodation?</b> Check your paperwork. The time limits apply if you have a social housing tenancy agreement. They may not apply if you have a licence. Either way, your landlord still has to keep you safe, so report the problem.</p>

<h2>Alarms</h2>
<p>Your landlord must fit a smoke alarm on every floor, and a carbon monoxide alarm in any room with a boiler or other fixed fuel-burning appliance, and repair them when you report a fault. See <a href="renting.html">renting</a>.</p>

<h2>If you'd find it hard to get out of a tall building</h2>
<p>Since 6 April 2026, in blocks of flats in England that are 18 metres or 7 storeys high or more, and in blocks over 11 metres where everyone is meant to leave when the alarm sounds, the person responsible for the building must offer a fire safety assessment to any resident who would struggle to get out without help, for example because of a disability or memory problems.</p>
<ul>
<li>You have to ask for it, or someone can ask for you. It's your choice.</li>
<li>They must talk through what would help, agree a written plan with you, and review it every year.</li>
<li>With your permission, they tell the fire service where you are.</li>
</ul>
<p>Ask your landlord or building manager for a "Residential PEEP". Also read <a href="high-rise-flats.html">living in a high-rise flat</a>.</p>

<h2>In a hostel, B&B, refuge or shared house</h2>
<ul>
<li><b>On your first day, find two ways out,</b> and where the fire alarm call point is.</li>
<li><b>Ask staff or the manager:</b> what happens in a power cut or a fire, and who do I phone at night?</li>
<li><b>Keep one small bag ready</b> with your medicines, phone charger, ID, any letters about your housing or benefits, and a few phone numbers on paper. If you have to leave quickly, that bag is what matters.</li>
<li><b>No kitchen of your own?</b> Keep a little food that needs no cooking or fridge: cereal bars, crackers, tinned fish with a ring pull, long-life milk.</li>
<li><b>Tell your council's housing team</b> if the place is unsafe: no working alarms, blocked exits, no heating. Keep a note of when you told them.</li>
<li><b>Join the <a href="priority-services-register.html">Priority Services Register</a></b> if you pay the energy or water bill. If you don't, ask the manager whether the building is registered.</li>
</ul>
""",
sources=["awaab_gov", "awaab_tenants", "awaab", "alarms", "rpeeps", "rpeeps_guide", "gmfrs_faq"],
),

# ---------------------------------------------------------------- SUPPORT SERVICES
dict(
slug="for-support-services", cat="help", mins=6, flag="advice",
title="For food banks, kitchens and community groups",
summary="How to help the people you support get ready, in a few minutes, without asking them to buy anything. Plus what to do when severe weather is forecast.",
body="""
<p class="lede">People on the lowest incomes are the least likely to be prepared, and the most likely to say cost is why. You already have their trust. A few small things from you can make a real difference.</p>

<h2>Five things you can do, most of them free</h2>
<ol class="todo">
<li><b>Do the Fettle check with someone.</b> It takes a few minutes on your phone or theirs. They don't need an account or an email address. Read the questions out if that's easier.</li>
<li><b>Help people join the <a href="priority-services-register.html">Priority Services Register</a>.</b> It's the single most useful free thing. You can do it with them in a few minutes.</li>
<li><b>Add no-cook food to parcels when storms are forecast:</b> ring-pull tins, cereal bars, crackers, long-life milk. Ask "can you heat food at home at the moment?" as a routine question.</li>
<li><b>Keep fuel voucher and crisis fund details to hand.</b> See <a href="help-you-can-get.html">help you can get</a> and <a href="prepayment-meters.html">prepayment meters</a>.</li>
<li><b>Hand out one sheet of paper</b> with the numbers below, and space to write in a neighbour's or family member's number.</li>
</ol>

<h2>If the people you support have nowhere stable to live</h2>
<ul>
<li><b>In severe cold,</b> councils open emergency beds for people sleeping rough. This is called SWEP, the Severe Weather Emergency Protocol. Each council decides when to open it, usually when it's forecast to freeze. Find out now who to phone at your council.</li>
<li><b>If you're worried about someone sleeping rough</b> in England or Wales, you can tell StreetLink, which passes it to the local outreach team. If someone is in danger, call 999.</li>
<li><b>For people in hostels, B&Bs or sofa-surfing,</b> see <a href="social-housing.html">social housing and temporary accommodation</a>.</li>
</ul>

<h2>Is your own building ready?</h2>
<ul>
<li>Could you open in a power cut? Think about light, a way to boil water, and a phone that works.</li>
<li>Do you know which of your regulars live alone, and who would check on them?</li>
<li>Could you be a warm, lit place for a few hours? Tell your council's emergency planning team: they may want to know.</li>
</ul>

<h2>If you want to do more</h2>
<p>Fettle for Communities lets staff and volunteers do checks with people, keep their plans with consent, and see, without names, what the people you support are missing and what gets in their way. Ask us about it.</p>
""" + NUMBERS,
sources=["survey_sd", "swep", "ofgem_psr", "crf_gov"],
),
]
