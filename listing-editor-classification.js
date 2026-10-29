/* Independent editor controls clone the real seller catalog, without touching creation drafts. */
window.createListingEditorClassification=(container,status)=>{
 container.innerHTML='<details><summary>Category, condition and item details</summary><label class="check-row"><input type="checkbox" id="editClassificationEnabled"> Change classification and item details</label><p class="file-help">Review your description when changing category. Your existing disclosures are preserved.</p><fieldset id="editClassificationFields" disabled style="border:0;padding:0;min-width:0;max-width:100%"></fieldset></details>';
 const fields=container.querySelector('fieldset'),enabled=container.querySelector('#editClassificationEnabled'),groups=new Map(),controls=new Map();let busy=false;
 const definitions=[['listingType','Listing type','all'],['category','Category','all'],['tcgGame','Game / series','cards'],['collectibleSubcategory','Collectible type','collectibles'],['gamePlatform','Game platform','games'],['consoleItemType','Hardware type','hardware'],['consoleBrand','Brand','hardware'],['consoleModel','Model','hardware'],['consoleStorage','Storage / version','hardware'],['condition','Condition','general'],['cardCondition','Card condition','cards'],['sportsBrand','Sports card brand','sports'],['gradingCompany','Grading company','graded'],['gradingScore','Grade','graded'],['gradingCert','Certification','graded'],['tcgEra','Era (optional)','cards'],['tcgSet','Set (optional)','cards'],['tcgCustomSet','Custom set','cards'],['tcgCardNumber','Card number','cards'],['tcgVariant','Variant','cards'],['tcgCustomVariant','Custom variant','cards'],['tcgRarity','Rarity','cards'],['tcgEdition','Edition / printing','cards'],['tcgLanguage','Language','cards'],['deckLeader','Deck name / leader','deck'],['deckCardCount','Number of cards','deck'],['deckList','Full decklist','deck']];
 for(const [source,label,group]of definitions){const el=document.getElementById(source).cloneNode(true);el.id='editAttribute_'+source;el.removeAttribute('aria-describedby');el.required=false;el.disabled=false;el.hidden=false;el.value='';const wrap=document.createElement('div'),heading=document.createElement('label');heading.htmlFor=el.id;heading.textContent=label;wrap.append(heading,el);fields.append(wrap);controls.set(source,el);groups.set(source,{wrap,group})}
 const get=id=>controls.get(id).value;
 const set=(id,value)=>{const el=controls.get(id);el.value=value??''};
 const defaults={single:'trading_cards',deck:'trading_cards',lot:'trading_cards',sealed:'trading_cards',game:'video_games',console:'consoles',figure:'collectibles',other:'other'};
 const allowed={trading_cards:['single','deck','lot','sealed'],video_games:['game'],consoles:['console'],controllers:['console'],accessories:['console'],collectibles:['figure'],other:['other']};
 function sets(){deckplayFillOptions(controls.get('tcgEra'),Object.keys(deckplaySets[get('tcgGame')]||{}),'Not specified');deckplayFillOptions(controls.get('tcgSet'),[],'Not specified');deckplayFillOptions(controls.get('tcgVariant'),deckplayVariants[get('tcgGame')]||['Regular','Holo','Foil','Alternate Art','Promo','Other'],'Not specified')}
 function sync(){
  const category=get('category'),cards=category==='trading_cards',hardware=['consoles','controllers','accessories'].includes(category);
  const visible={all:true,cards,hardware,collectibles:category==='collectibles',games:category==='video_games',general:!cards,sports:cards&&get('tcgGame')==='sports_cards',graded:cards&&get('cardCondition')==='graded',deck:get('listingType')==='deck'};
  const required=new Set(['category','listingType','tcgGame','collectibleSubcategory','gamePlatform','consoleItemType','consoleBrand','consoleModel','condition','cardCondition','sportsBrand','gradingCompany','gradingScore','deckLeader','deckCardCount','deckList']);
  for(const [id,{wrap,group}]of groups){wrap.hidden=!visible[group];controls.get(id).disabled=busy||!enabled.checked||!visible[group];controls.get(id).required=enabled.checked&&visible[group]&&required.has(id)}
  fields.disabled=busy||!enabled.checked;enabled.disabled=busy;
 }
 fields.addEventListener('change',e=>{
  const id=[...controls].find(([,el])=>el===e.target)?.[0];
  if(id==='listingType')set('category',defaults[get(id)]);
  if(id==='category'&&!allowed[get(id)]?.includes(get('listingType')))set('listingType',allowed[get(id)]?.[0]||'other');
  if(id==='tcgGame')sets();
  if(id==='tcgEra')deckplayFillOptions(controls.get('tcgSet'),deckplaySets[get('tcgGame')]?.[get('tcgEra')]||[],'Not specified');
  if(id==='category'&&['consoles','controllers','accessories'].includes(get(id)))set('consoleItemType',{consoles:'Console',controllers:'Controller',accessories:'Accessory'}[get(id)]);
  sync();
 });enabled.addEventListener('change',sync);
 const strip=text=>String(text||'').replace(/^\[Listing classification\]\n[\s\S]*?\n\[End classification\]\n*/,'');
 function reset(row={}){
  for(const [id,el]of controls){el.value='';if(id==='condition')el.value='used';if(id==='cardCondition')el.value='lightly_played'}
  enabled.checked=false;container.querySelector('details').open=false;busy=false;
  set('category',row.category||'trading_cards');set('listingType',row.product_type||allowed[get('category')]?.[0]||'single');set('tcgGame',row.tcg_game);sets();set('collectibleSubcategory',row.collectible_subcategory);set('condition',row.condition||'used');
  const description=String(row.description||''),line=label=>description.match(new RegExp('(?:^|\\n)'+label+': ([^\\n]*)'))?.[1]||'';
  for(const [id,label]of [['gamePlatform','Platform'],['consoleItemType','Hardware type'],['consoleBrand','Brand'],['consoleModel','Model'],['consoleStorage','Storage / version'],['sportsBrand','Sports brand'],['gradingCompany','Grader'],['gradingScore','Grade'],['gradingCert','Certification'],['tcgCustomSet','Set'],['tcgCardNumber','Card number'],['tcgCustomVariant','Variant'],['tcgRarity','Rarity'],['tcgEdition','Edition / printing'],['tcgLanguage','Language'],['deckLeader','Deck'],['deckCardCount','Cards']])set(id,line(label));
  const conditionLine=line('Card condition');const option=[...controls.get('cardCondition').options].find(o=>o.textContent.trim()===conditionLine||description.includes('[Card Condition]\n'+o.textContent.trim()));
  if(option)set('cardCondition',option.value);else if(row.condition==='graded')set('cardCondition','graded');else if(row.condition==='new')set('cardCondition','sealed');
  set('deckList',description.match(/Full decklist:\n([\s\S]*?)(?:\n\[End classification\]|\n\n|$)/)?.[1]||'');
  if(!get('consoleItemType'))set('consoleItemType',{consoles:'Console',controllers:'Controller',accessories:'Accessory'}[get('category')]);sync();
 }
 function values(description){
  if(!enabled.checked)return null;sync();const invalid=[...controls.values()].find(el=>!el.disabled&&!el.checkValidity());if(invalid){invalid.focus();throw Error('Review '+invalid.labels?.[0]?.textContent+' before saving.')}
  const category=get('category'),type=get('listingType'),cards=category==='trading_cards';
  if(type==='deck'){const q=deckQuantitySummary(get('deckList'));if(q.invalid||(q.complete&&q.total!==Number(get('deckCardCount'))))throw Error('Deck quantities must match the declared card count.')}
  if(type==='lot'&&!strip(description).trim())throw Error('Describe every item, quantity and condition included in the lot.');
  const lines=['Category: '+controls.get('category').selectedOptions[0].textContent,'Listing type: '+controls.get('listingType').selectedOptions[0].textContent];
  const labels={gamePlatform:'Platform',consoleItemType:'Hardware type',consoleBrand:'Brand',consoleModel:'Model',consoleStorage:'Storage / version',sportsBrand:'Sports brand',gradingCompany:'Grader',gradingScore:'Grade',gradingCert:'Certification',tcgCardNumber:'Card number',tcgRarity:'Rarity',tcgEdition:'Edition / printing',tcgLanguage:'Language',deckLeader:'Deck',deckCardCount:'Cards',deckList:'Full decklist'};
  if(cards)lines.push('Card condition: '+controls.get('cardCondition').selectedOptions[0].textContent);
  for(const [id,label]of Object.entries(labels))if(!controls.get(id).disabled&&get(id).trim())lines.push(label+(id==='deckList'?':\n':': ')+get(id).trim());
  if(cards){const setName=get('tcgCustomSet').trim()||get('tcgSet'),variant=get('tcgCustomVariant').trim()||get('tcgVariant');if(setName)lines.push('Set: '+setName);if(variant)lines.push('Variant: '+variant)}
  return {category,product_type:type,tcg_game:cards?get('tcgGame'):null,collectible_subcategory:category==='collectibles'?get('collectibleSubcategory'):null,condition:cards?({near_mint:'like_new',lightly_played:'used',moderately_played:'used',heavily_played:'damaged',damaged:'damaged',sealed:'new',graded:'graded'})[get('cardCondition')]:get('condition'),description:'[Listing classification]\n'+lines.join('\n')+'\n[End classification]\n\n'+strip(description)};
 }
 reset();return {reset,values,strip,preserve(original,edited){if(strip(original).trim()===(edited||'').trim())return original;const prefix=String(original||'').match(/^\[Listing classification\]\n[\s\S]*?\n\[End classification\]\n*/)?.[0]||'';return prefix+(edited||'')||null},setBusy(value){busy=value;sync()}};
};
