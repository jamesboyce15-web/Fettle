# Fettle free guides: content.
# Each guide is plain HTML for the article body. Keep sentences short and plain.
# Every fact should come from a source in "sources". Update CHECKED when you re-check them.

CHECKED = "7 November 2026"

S = {  # shared sources
    "fsa_power": ("Food Standards Agency: food safety in a power cut", "https://www.gov.uk/government/publications/food-safety-in-a-power-cut-advice-for-consumers/food-safety-in-a-power-cut-advice-for-consumers"),
    "cmo_food": ("UK Chief Medical Officers: food and nutrition in a national power outage", "https://www.gov.uk/government/publications/public-health-advice-from-uk-cmos-during-a-national-power-outage/food-and-nutrition-scripts-for-broadcast-media"),
    "beready": ("Cabinet Office: Be Ready, households encouraged to take small, simple steps", "https://www.gov.uk/government/news/households-encouraged-to-take-small-simple-steps-to-stay-prepared-in-an-emergency"),
    "gmfrs_stay": ("Greater Manchester Fire and Rescue Service: flats with a stay safe policy", "https://manchesterfire.gov.uk/your-safety/home-fire-safety/flat-safety/what-is-your-building-s-evacuation-strategy/fire-safety-information-for-residents-living-in-flats-operating-a-stay-safe-policy/"),
    "gmfrs_faq": ("Greater Manchester Fire and Rescue Service: high-rise residents' FAQs", "https://www.manchesterfire.gov.uk/your-safety/high-rise-and-building-safety-taskforce/support-for-high-rise-residents/residents-faqs"),
    "nhs_feed": ("NHS Start for Life: how to make up a formula feed", "https://www.nhs.uk/start-for-life/baby/feeding-your-baby/bottle-feeding/how-to-make-up-a-feed"),
    "fsa_formula": ("Food Standards Agency: preparing infant formula safely during water supply disruptions (2 November 2026)", "https://www.gov.uk/government/publications/preparing-infant-formula-safely-during-water-supply-disruptions-and-when-travelling"),
    "ofgem_psr": ("Ofgem: join your supplier's Priority Services Register", "https://www.ofgem.gov.uk/your-energy-supply/how-manage-your-energy-supply/join-your-suppliers-priority-services-register"),
    "psr": ("The Priority Services Register (energy networks)", "https://www.thepsr.co.uk"),
    "enwl_psr": ("Electricity North West: Priority Services Register", "https://www.enwl.co.uk/priority"),
    "uu_psr": ("United Utilities: Priority Services", "https://www.unitedutilities.com/priorityservices"),
    "ofcom_power": ("Ofcom: guidance on access to emergency calls during a power cut", "https://www.ofcom.org.uk/__data/assets/pdf_file/0016/123118/guidance-emergency-access-power-cut.pdf"),
    "alarms": ("GOV.UK: smoke and carbon monoxide alarms, booklet for landlords", "https://www.gov.uk/government/publications/smoke-and-carbon-monoxide-alarms-explanatory-booklet-for-landlords"),
    "redcross": ("British Red Cross: learn first aid (free)", "https://www.redcross.org.uk/first-aid/learn-first-aid"),
    "survey": ("Cabinet Office: UK public survey of risk perception, resilience and preparedness 2026", "https://www.gov.uk/government/statistics/uk-public-survey-of-risk-perception-resilience-and-preparedness-2026/uk-public-survey-of-risk-perception-resilience-and-preparedness-2026-headline-findings-html"),
}

CATS = [
    ("start", "Start here"),
    ("power", "Power cuts"),
    ("water", "Water"),
    ("food", "Food"),
    ("home", "Your home"),
    ("people", "People you look after"),
]

NUMBERS = """<div class="numbers"><h2>Numbers to keep on paper</h2><dl>
<div><dt>Power cut</dt><dd><b>105</b> (free, any network)</dd></div>
<div><dt>Smell gas</dt><dd><b>0800 111 999</b></dd></div>
<div><dt>Life at risk</dt><dd><b>999</b>. If you can't speak, register for emergencySMS: text <b>register</b> to <b>999</b></dd></div>
<div><dt>Not an emergency, need medical help</dt><dd><b>111</b></dd></div>
</dl></div>"""

GUIDES = [

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
<p>A barbecue, camping stove or outdoor heater gives off carbon monoxide, which can kill in minutes. Balconies count as indoors for this: fumes come back in, and a fire on a balcony can spread up the building. If you have no gas hob, plan for <a href="no-cook-meals.html">no-cook meals</a>.</p>

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
<p>Tell your landlord or building manager if anyone in your home would struggle to get down the stairs in an emergency, because of age, disability, illness or a baby and other small children. Ask them to record it and whether they'll make a personal evacuation plan. Tell the fire service when you call 999, too.</p>
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
sources=["gmfrs_stay", "gmfrs_faq", "beready", "fsa_power", "psr"],
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
<li>Use hand sanitiser before preparing food and after the toilet.</li>
<li>Wipe the tin lid before opening it.</li>
<li>Use paper plates, or one bowl each that you wipe out.</li>
<li>If you can't wash fruit, peel it.</li>
</ul>
<p>Food safety when the fridge is off is in <a href="eating-safely-without-power.html">our guide to eating safely without power</a>.</p>
""",
sources=["beready", "cmo_food", "fsa_power"],
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
<li>Don't taste food to check it. Food that would make you ill can look and smell fine.</li>
<li>If frozen food has thawed, treat it as chilled food. Don't refreeze raw food that has thawed.</li>
</ul>

<h2>Who should be extra careful</h2>
<p>After 4 hours without power, these people should <b>not</b> eat chilled ready-to-eat food (things like cooked meats, smoked fish, soft cheese, pâté, prepared salads and sandwiches) or leftovers:</p>
<ul>
<li>babies and young children</li>
<li>pregnant and breastfeeding women</li>
<li>older people</li>
<li>anyone with a weakened immune system, for example from cancer treatment</li>
</ul>
<p>Eat food from tins and packets instead. If there's no clean water for washing, peel fruit and vegetables.</p>

<h2>If you can cook</h2>
<ul>
<li><b>A gas hob may still work</b> in a power cut, but the electric spark won't. Light it carefully with a long match. If you smell gas, turn it off and call 0800 111 999.</li>
<li><b>Camping stoves and barbecues are for outside only,</b> in a garden or open space. Never use them indoors, in a garage, a tent, or on a balcony. They give off carbon monoxide, which you can't see or smell and which can kill.</li>
<li>Cook food until it's <b>steaming hot</b> all the way through.</li>
</ul>

<h2>If you can't cook</h2>
<p>You don't need hot food to stay well for a few days. Tins, crackers, oats, long-life milk, fruit and peanut butter will do. See <a href="no-cook-meals.html">six no-cook meals from your cupboard</a>.</p>

<h2>Drink enough</h2>
<p>Keep drinking, especially children and older people. Plan on <b>3 litres of water per person per day</b>. Children under 2 who aren't breastfed need at least a litre of fluid a day. For babies, see <a href="feeding-a-baby.html">feeding a baby when the power or water fails</a>.</p>

<h2>Before it happens</h2>
<ol class="todo">
<li>Put a fridge thermometer in the fridge (about £3).</li>
<li>Keep your freezer reasonably full. Bottles of tap water fill gaps and help it stay cold.</li>
<li>Keep 3 days of food that needs no cooking or fridge.</li>
<li>If you have a gas hob, keep long matches next to it.</li>
</ol>
""",
sources=["fsa_power", "cmo_food", "beready"],
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
<li><b>Get your torch.</b> Use torches, not candles, because candles start fires.</li>
<li><b>Unplug</b> things that could come on unexpectedly when the power returns, like a cooker, heater or iron, and sensitive things like the TV and computer. Leave one light switched on so you know when it's back.</li>
<li><b>Keep the fridge and freezer shut.</b></li>
</ol>

<h2>The first few hours</h2>
<ul>
<li><b>Save your phone battery.</b> Turn on low-power mode, close apps and lower the screen brightness. Use a power bank if you have one.</li>
<li><b>Your landline may not work.</b> Most home phones now run through the broadband router, which needs mains power. Providers must offer a backup solution that keeps emergency calls working for at least an hour to customers who rely on their landline, such as people with no mobile signal or with telecare alarms. If that's you or someone you look after, ask your provider about it now.</li>
<li><b>Mobile signal can drop</b> in a long power cut, as masts run out of battery. Agree with your household where you'll meet and who checks on whom, in case you can't call.</li>
<li><b>Listen to local radio</b> on a battery or wind-up radio for updates.</li>
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
<li>Check the fridge and freezer before eating anything from them.</li>
<li>Reset clocks, timers and the boiler if it needs it.</li>
<li>Recharge torches, power banks and phones, and replace anything you used.</li>
</ul>

""" + NUMBERS,
sources=["beready", "fsa_power", "ofcom_power", "psr"],
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
<li><b>Boil water notice:</b> the water is safe once boiled. Boil it and let it cool before drinking, brushing teeth, preparing food or making ice.</li>
<li><b>Do not drink notice:</b> don't drink it even if you boil it. You can usually still use it to flush the toilet, and sometimes for washing. Check what your notice says.</li>
<li><b>Do not use notice:</b> don't use the water for anything except flushing the toilet.</li>
</ul>
<p>Babies need special care. See <a href="feeding-a-baby.html">feeding a baby when the water fails</a>.</p>

<h2>Toilets</h2>
<ul>
<li>If you have water that isn't safe to drink, you can usually use it to flush. Pour a bucket into the bowl.</li>
<li>Don't use your stored drinking water for flushing.</li>
<li>If there's no water at all, line the toilet bowl with a bin bag, use it, tie it up and put it in your outside bin. Keep a roll of strong bin bags for this.</li>
</ul>

<h2>Washing</h2>
<ul>
<li>Use hand sanitiser, especially before preparing food and after the toilet.</li>
<li>Keep a pack of wet wipes for washing.</li>
<li>Use paper plates and cups to save washing up.</li>
</ul>

<h2>Bottled water stations</h2>
<p>In a long outage, water companies often set up bottled water stations. Queues can be long, and carrying water is hard for older and disabled people. If you're on your water company's <a href="priority-services-register.html">Priority Services Register</a>, they may deliver water to you instead. You have to join your water company's register separately from the energy one.</p>

<h2>Sort these out now</h2>
<ol class="todo">
<li>Buy 3 days of bottled water for everyone at home.</li>
<li>Find your stopcock, so you can turn off the water if a pipe bursts.</li>
<li>Keep bin bags, hand sanitiser and wet wipes.</li>
<li>If you'd struggle to collect water, join your water company's Priority Services Register.</li>
</ol>
""",
sources=["beready", "uu_psr", "fsa_formula"],
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
<li>Close doors to the rooms you're not using.</li>
</ul>

<h2>Keep bodies warm</h2>
<ul>
<li>Wear several thin layers rather than one thick one. Add hats, gloves, thick socks and slippers.</li>
<li>Use blankets, sleeping bags and duvets, even during the day.</li>
<li>Eat regularly and have warm drinks if you can heat water safely.</li>
<li>Move around a little each hour if you're able.</li>
<li>Babies need to be warm, but don't overwrap them or use hats and extra blankets in bed. Dress them in layers you can adjust.</li>
</ul>

<h2>The carbon monoxide danger</h2>
<p>When people are cold, they bring in things to heat the house: a barbecue, a camping stove, a patio heater, or a generator. All of these give off <b>carbon monoxide</b>. You can't see, smell or taste it, and it can kill in minutes.</p>
<ul>
<li><b>Never</b> use barbecues, camping stoves, outdoor heaters or generators indoors, in a garage, or on a balcony.</li>
<li>Never use a gas oven or hob to heat the room.</li>
<li>Fit a carbon monoxide alarm in any room with a gas, oil, coal or wood appliance.</li>
<li>Signs of carbon monoxide poisoning include a headache, dizziness, feeling sick, tiredness and confusion, often in more than one person at once. If you suspect it, get into fresh air, call 0800 111 999 for a gas appliance, and call 999 if someone is seriously unwell.</li>
</ul>

<h2>When cold becomes an emergency</h2>
<p>Shivering is normal. Get help if someone is confused, very drowsy, has slurred speech, or stops shivering while still very cold. Call 999 if they're seriously unwell, or 111 for advice.</p>

<h2>Sort these out before winter</h2>
<ol class="todo">
<li>Keep enough blankets or sleeping bags for everyone.</li>
<li>Keep hats, gloves and warm socks together where you can find them in the dark.</li>
<li>Fit a carbon monoxide alarm if you have any fuel-burning appliance.</li>
<li>Keep a torch and spare batteries in the room you'll use.</li>
<li>Check on older neighbours and relatives when a cold spell is forecast. See <a href="checking-on-someone.html">checking on someone</a>.</li>
</ol>
""",
sources=["beready", "alarms", "cmo_food"],
),

# ---------------------------------------------------------------- BABY
dict(
slug="feeding-a-baby", cat="people", mins=6, flag="clinical",
title="Feeding a baby when the power or water fails",
summary="Breastfeeding, ready-made formula, powder formula and sterilising. What to keep in, and what the official guidance says about bottled water.",
body="""
<p class="lede">Babies can't wait, and powder formula needs water at a temperature you may not be able to reach in a power cut. A small stock of the right things removes most of the worry.</p>

<h2>If you're breastfeeding</h2>
<p>Breastfeeding needs no power, water or equipment. Keep going, and drink plenty yourself. Breastfeeding women should also avoid chilled ready-to-eat food and leftovers after 4 hours without power.</p>

<h2>Ready-made formula is the easiest backup</h2>
<p>Ready-to-feed liquid formula comes sterile in a carton or bottle and needs no water or heating. Keep 3 days' worth at home, plus a supply of single-use pre-sterilised bottles or teats, and rotate it before it goes out of date.</p>
<ul>
<li>Work out 3 days: the number of feeds your baby has a day, times the amount per feed, times 3.</li>
<li>Once opened, follow the storage instructions on the pack. Without a fridge, use an opened carton straight away.</li>
<li>Throw away any milk left in the bottle after a feed.</li>
</ul>

<h2>If you use powder formula</h2>
<p>The NHS says to make up powder formula with <b>freshly boiled tap water that's still at least 70°C</b>, which means using it within 30 minutes of boiling. Hot water kills bacteria that can be in the powder.</p>
<ul>
<li>A <b>gas hob</b> may still work in a power cut. Light it with a match.</li>
<li>A camping stove is fine <b>outside only</b>, never indoors or on a balcony.</li>
<li>A flask of boiled water does <b>not</b> stay hot enough to make powder formula safely.</li>
</ul>

<h2>If the tap water is off or not safe</h2>
<p>Bottled water isn't usually recommended for formula, because some contains too much salt (sodium) or sulphate. The Food Standards Agency published guidance in November 2026 on preparing formula when the water supply is disrupted, including how to choose a suitable bottled water. <a href="https://www.gov.uk/government/publications/preparing-infant-formula-safely-during-water-supply-disruptions-and-when-travelling" target="_blank" rel="noopener">Read the FSA guidance</a> and follow it. During a boil water or do not drink notice, your water company will also give advice for babies.</p>

<h2>Sterilising</h2>
<ul>
<li>Single-use pre-sterilised bottles avoid the problem entirely.</li>
<li>Cold-water sterilising tablets or liquid work without power, but need clean water.</li>
<li>Steam sterilisers and microwave sterilisers need power.</li>
</ul>

<h2>Keep baby warm, fed and changed</h2>
<ul>
<li>Keep 3 days of nappies and wipes.</li>
<li>Dress your baby in layers you can add or remove. Don't overwrap them in bed.</li>
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
sources=["nhs_feed", "fsa_formula", "cmo_food", "ofgem_psr"],
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
<li>Don't let medicines freeze. If you use ice packs, wrap them so they don't touch the medicine.</li>
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
<li>Keep a few days of every medicine, and a copy of the prescription.</li>
<li>Charge any backup batteries and power banks.</li>
<li>Join the Priority Services Register.</li>
</ol>
""",
sources=["ofgem_psr", "psr", "enwl_psr"],
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
<li>Private landlords must have the electrics inspected at least every 5 years and give you a copy of the report.</li>
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
<li>Join the <a href="priority-services-register.html">Priority Services Register</a> if you're eligible. You don't need your landlord's permission.</li>
<li>If you live in a flat, read <a href="high-rise-flats.html">living in a high-rise flat</a>.</li>
</ul>
""",
sources=["alarms", "gmfrs_stay", "beready"],
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
<li>A few days of every medicine, and a copy of the prescription</li>
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
sources=["beready", "survey", "redcross"],
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
]
