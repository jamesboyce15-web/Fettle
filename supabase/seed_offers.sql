-- Partner schemes worth joining, found Nov 2026. All start switched off with no link: James joins each one, pastes his
-- link in admin (Offers), checks a "from" price on their site, and switches it on. Commission is as each scheme published it.
insert into public.offers (kind, sectors, provider, headline, commission, network, live, notes) values
 ('insurance', '{cafe,salon}', 'Simply Business', 'Compare cover from several insurers in one form', '10% of what the customer pays, capped at £100; 30-day cookie', 'CJ', false, 'Apply at simplybusiness.co.uk/affiliates. They are the FCA-authorised broker and do the arranging.'),
 ('insurance', '{salon}', 'Ripe Insurance (hair and beauty)', 'Insurance made for hair and beauty businesses', '15% listed', 'Partnerize', false, 'Check the scheme is open, and that it covers business (not just freelance) policies.'),
 ('energy', '{cafe,salon}', 'Love Energy Savings', 'Compare business energy prices', 'Up to £50 a switch', 'Direct / Partnerize', false, 'Ask how they show their commission before the owner signs (Ofgem rules).'),
 ('energy', '{cafe,salon}', 'Business Juice', 'Compare business energy prices', '£30 a sale (at launch); 30-day cookie', 'Awin', false, 'Check current terms on Awin.'),
 ('card', '{cafe,salon}', 'Dojo', 'Card machines with next-day payouts', 'Referral rewards: ask their partner team', 'Direct', false, 'dojo.tech/partner-programme'),
 ('card', '{cafe,salon}', 'Lopay', 'Low-fee card payments on a phone or reader', '50/50 revenue share, for life', 'Direct', false, 'Good fit for smaller salons and chair renters.');
