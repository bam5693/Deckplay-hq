// Read-only generator. Execute its SQL ONLY against prrrzeelltmyugssqnzk.
// Stable IDs + DO NOTHING avoid duplicates or overwriting manually exercised fixtures.
const fs=require('node:fs');
const catalog=JSON.parse(fs.readFileSync('tests/fixtures/category-catalog.json'));
const rows=catalog.rows.map(({key,label,fields},i)=>({key,label,fields,ordinal:i}));
const data=JSON.stringify(rows).replaceAll("'","''");
const sql=`-- ISOLATED STAGING ONLY: prrrzeelltmyugssqnzk
DO $guard$ BEGIN
 IF NOT EXISTS (select 1 from auth.users where id='4288f999-c6fb-44ae-a4c0-98d339cea0d1' and email='deckplay-seller@deckplay.test') OR NOT EXISTS (select 1 from auth.users where id='a6a9c007-e734-49e9-abcb-fe234b903609' and email='deckplay-buyer@deckplay.test') THEN RAISE EXCEPTION 'Dedicated synthetic staging identities required'; END IF;
 IF EXISTS(select 1 from public.listings l join jsonb_array_elements('${data}'::jsonb) r on l.id=md5('deckplay-category-v1/'||(r->>'key'))::uuid where l.title not like 'TEST ONLY CATALOG %' or l.seller_id not in ('4288f999-c6fb-44ae-a4c0-98d339cea0d1'::uuid,'a6a9c007-e734-49e9-abcb-fe234b903609'::uuid)) THEN RAISE EXCEPTION 'Fixture ID collision'; END IF;
END $guard$;
INSERT INTO public.listings(id,seller_id,title,description,category,product_type,condition,price,image_urls,accepts_trades,accepts_price_offers,tcg_game,collectible_subcategory,status)
select md5('deckplay-category-v1/'||(r->>'key'))::uuid,
(case when (r->>'ordinal')::int%2=0 then '4288f999-c6fb-44ae-a4c0-98d339cea0d1' else 'a6a9c007-e734-49e9-abcb-fe234b903609' end)::uuid,
left('TEST ONLY CATALOG '||(r->>'label'),120),
 'TEST ONLY CATALOG v1 — Synthetic demonstration. No physical item, payment or shipment.'||chr(10)||
case when r->'fields'->>'listingType'='deck' then '[Complete Deck]'||chr(10)||'Deck: Synthetic sample'||chr(10)||'Cards: 2'||chr(10)||'Full decklist:'||chr(10)||'2x Synthetic card'||chr(10) when r->'fields'->>'listingType'='lot' then '[Card Lot / Collection]'||chr(10)||'2 synthetic cards, mixed conditions.'||chr(10) else '' end||
coalesce('Platform: '||(r->'fields'->>'gamePlatform')||chr(10),'')||coalesce('Brand: '||(r->'fields'->>'consoleBrand')||chr(10),'')||
'Exact condition is synthetic; check photos in real listings.',
r->'fields'->>'category',r->'fields'->>'listingType',
(case (r->>'ordinal')::int%4 when 0 then 'new' when 1 then 'like_new' when 2 then 'used' else 'damaged' end),
(3.25+((r->>'ordinal')::int%30)*4.5)::numeric,
ARRAY['https://deckplay-hq-staging.cstivers56.workers.dev/test-inventory-placeholder.svg'],
(r->>'ordinal')::int%3<>0,(r->>'ordinal')::int%4<>0,
r->'fields'->>'tcgGame',r->'fields'->>'collectibleSubcategory','active'
from jsonb_array_elements('${data}'::jsonb) r
ON CONFLICT(id) DO NOTHING;
select category,count(*) as fixtures from public.listings where title like 'TEST ONLY CATALOG %' and description like 'TEST ONLY CATALOG v1%' and seller_id in ('4288f999-c6fb-44ae-a4c0-98d339cea0d1'::uuid,'a6a9c007-e734-49e9-abcb-fe234b903609'::uuid) group by category order by category;`;
fs.writeFileSync('/tmp/deckplay-category-inventory.sql',sql);console.log('Generated '+rows.length+' stable staging-only fixtures in /tmp/deckplay-category-inventory.sql');
