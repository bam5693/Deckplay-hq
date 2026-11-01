function latestEditorClassification(description){
 const edits=[...String(description||"").matchAll(/(?:^|\n)\[Listing classification\]\r?\n([\s\S]*?)\r?\n\[End classification\]/g)];
 return edits.length?edits[edits.length-1][1]:null;
}
// Generated classification belongs in structured controls, not duplicate
// free-text notes after multiple seller edits.
function listingEditorVisibleDescription(description){
 const withoutContents=String(description||"").replace(/\r\n/g,"\n").replace(/^\[Listing contents\]\r?\n[\s\S]*?\r?\n\[End listing contents\]\r?\n*/,"");
 const withoutEdits=withoutContents.replace(/(?:^|\r?\n)\[Listing classification\]\r?\n[\s\S]*?\r?\n\[End classification\](?=\r?\n|$)/g,"\n");
 // A first-time listing may contain these old, app-generated blocks alongside
 // the newer authoritative classification. Never put stale sport/platform or
 // card-condition metadata back into editable seller prose.
 const withoutLegacy=latestEditorClassification(description)===null?withoutEdits:withoutEdits
  // A published deck has an app-generated original list before [Card Condition].
  // On later edits the current classification is authoritative; never put the
  // superseded list back into the seller notes. Keep unmarked seller prose.
  .replace(/(?:^|\n)\[Complete Deck\]\r?\nDeck:[^\n]*\r?\nCards:[^\n]*\r?\n\r?\nFull decklist:\r?\n[\s\S]*?(?=\r?\n\r?\n\[Card Condition\]\r?\n)/g,"\n")
  .replace(/(?:^|\n)\[Sports Cards\]\nSport:[^\n]*\nBrand:[^\n]*\nYear:[^\n]*\nPlayer:[^\n]*(?:\nProduct line:[^\n]*)?/g,"\n")
  .replace(/(?:^|\n)\[Video Game\]\nPlatform:[^\n]*/g,"\n")
  // The original seller form put unmarked TCG set/variant lines immediately
  // after [Card Condition]. When a later classification exists, remove only
  // an entire recognizable multi-field generated paragraph. A lone "Set:"
  // line may be the seller's own note and must not be silently discarded.
  .replace(/(^|\n)\[Card Condition\]\n[^\n]*(?:\n\n([^\n]+(?:\n[^\n]+)*))?/g,(match,lead,paragraph)=>{
   const lines=String(paragraph||"").split("\n");
   const generated=lines.length>=2&&lines.every(line=>/^(?:Era|Set|Card number|Variant|Rarity|Edition \/ printing|Language):\s*\S/.test(line));
   return lead+(generated?"":paragraph?"\n\n"+paragraph:"");
  })
  // Grading details were another generated legacy block. The newer
  // classification is authoritative; keep only actual seller prose.
  .replace(/(?:^|\n)\[Graded Card\]\nGrader:[^\n]*\nGrade:[^\n]*(?:\nCertification:[^\n]*)?/g,"\n");
 return withoutLegacy.replace(/^\n+|\n+$/g,"").replace(/\n{3,}/g,"\n\n");
}
function listingEditorLatestDeckList(description){
 const latest=latestEditorClassification(description);
 const source=(latest??String(description||"")).replace(/\r\n?/g,"\n");
 const match=source.match(/(?:^|\n)Full decklist:\n([\s\S]*)/);
 if(!match)return "";
 if(latest!==null){
  // Older edits appended Set/Variant AFTER the decklist, and blank lines
  // inside a decklist are meaningful separators, not an end marker.
  return match[1].replace(/(?:\n(?:Set|Variant):[^\n]*)+\s*$/,"").trim();
 }
 // Original published decks separated the list from subsequent disclosure
 // blocks with a blank paragraph. Preserve that legacy boundary.
 return match[1].split(/\n\n/)[0].trim();
}
// Preserve the current public classification and quantity disclosure when
// editing prose, without reintroducing superseded generated identity blocks.
function listingEditorPreserveDescription(original,edited){
 const raw=String(original||""),notes=String(edited||"");
 if(listingEditorVisibleDescription(raw).trim()===notes.trim())return original;
 const contents=raw.match(/^\[Listing contents\]\r?\n[\s\S]*?\r?\n\[End listing contents\]/)?.[0]||"";
 const latest=latestEditorClassification(raw);
 const classification=latest===null?"":"[Listing classification]\n"+latest+"\n[End classification]";
 return [contents,classification,notes.trim()].filter(Boolean).join("\n\n")||null;
}
// Restore a known catalog value as a select, never as an invisible custom
// override. Unknown historical releases remain editable custom values.
function listingEditorRestoreSportsBrand(options,saved){
 const value=String(saved||'').trim();
 if(!value)return {selected:'',custom:''};
 if(Array.from(options||[]).some(option=>option.value===value))return {selected:value,custom:''};
 return {selected:'Other / Unknown',custom:value};
}
function listingEditorRestoreCatalogChoice(options,saved){
 const value=String(saved||'').trim();
 const known=value&&Array.from(options||[]).some(option=>option.value===value);
 return {selected:known?value:'',custom:known?'':value};
}
/* Independent editor controls clone the real seller catalog, without touching creation drafts. */
window.createListingEditorClassification=(container,status)=>{
 container.innerHTML='<details><summary>Category, condition and item details</summary><label class="check-row"><input type="checkbox" id="editClassificationEnabled"> Change classification and item details</label><p class="file-help">Review your description when changing category. Your existing disclosures are preserved.</p><fieldset id="editClassificationFields" disabled style="border:0;padding:0;min-width:0;max-width:100%"></fieldset></details>';
 const fields=container.querySelector('fieldset'),enabled=container.querySelector('#editClassificationEnabled'),groups=new Map(),controls=new Map();let busy=false;
 const definitions=[['listingIncludedQuantity','Quantity included','all'],['listingQuantityUnit','Quantity unit','all'],['listingContentsList','Item-by-item contents','all'],['listingType','Listing type','all'],['category','Category','all'],['tcgGame','Game / series','cards'],['collectibleSubcategory','Collectible type','collectibles'],['gamePlatform','Game platform','games'],['consoleItemType','Hardware type','hardware'],['consoleBrand','Brand','hardware'],['consoleModel','Model','hardware'],['consoleStorage','Storage / version','hardware'],['condition','Condition','general'],['cardCondition','Card condition','cards'],['sportsSport','Sport','sports'],['sportsBrand','Sports card brand','sports'],['sportsBrandCustom','Brand not listed (optional)','sports'],['sportsProductLine','Product line (optional)','sports'],['sportsYear','Card year','sports'],['sportsPlayer','Player or subject','sports'],['gradingCompany','Grading company','graded'],['gradingScore','Grade','graded'],['gradingCert','Certification','graded'],['tcgEra','Era (optional)','cards'],['tcgSet','Set (optional)','cards'],['tcgCustomSet','Custom set','cards'],['tcgCardNumber','Card number','cards'],['tcgVariant','Variant','cards'],['tcgCustomVariant','Custom variant','cards'],['tcgRarity','Rarity','cards'],['tcgEdition','Edition / printing','cards'],['tcgLanguage','Language','cards'],['deckLeader','Deck name / leader','deck'],['deckCardCount','Number of cards','deck'],['deckList','Full decklist','deck']];
 for(const [source,label,group]of definitions){const el=document.getElementById(source).cloneNode(true);el.id='editAttribute_'+source;el.removeAttribute('aria-describedby');el.required=false;el.disabled=false;el.hidden=false;el.value='';const wrap=document.createElement('div'),heading=document.createElement('label');heading.htmlFor=el.id;heading.textContent=label;wrap.append(heading,el);fields.append(wrap);controls.set(source,el);groups.set(source,{wrap,group})}
 const get=id=>controls.get(id).value;
 const set=(id,value)=>{const el=controls.get(id);el.value=value??''};
 const defaults={single:'trading_cards',deck:'trading_cards',lot:'trading_cards',sealed:'trading_cards',game:'video_games',console:'consoles',figure:'collectibles',other:'other'};
 const allowed={trading_cards:['single','deck','lot','sealed'],video_games:['game'],consoles:['console'],controllers:['console'],accessories:['console'],collectibles:['figure'],other:['other']};
 function sets(){deckplayFillOptions(controls.get('tcgEra'),Object.keys(deckplaySets[get('tcgGame')]||{}),'Not specified');deckplayFillOptions(controls.get('tcgSet'),[],'Not specified');deckplayFillOptions(controls.get('tcgVariant'),deckplayVariants[get('tcgGame')]||['Regular','Holo','Foil','Alternate Art','Promo','Other'],'Not specified')}
 function sync(){
  const category=get('category'),cards=category==='trading_cards',hardware=['consoles','controllers','accessories'].includes(category);
  const visible={all:true,cards,hardware,collectibles:category==='collectibles',games:category==='video_games',general:!cards,sports:cards&&get('tcgGame')==='sports_cards',graded:cards&&get('cardCondition')==='graded',deck:get('listingType')==='deck'};
  const required=new Set(['category','listingType','tcgGame','collectibleSubcategory','gamePlatform','consoleItemType','consoleBrand','consoleModel','condition','cardCondition','sportsSport','sportsBrand','sportsYear','sportsPlayer','gradingCompany','gradingScore','deckLeader','deckCardCount','deckList']);
  for(const [id,{wrap,group}]of groups){wrap.hidden=!visible[group]||(id==='category'&&get('listingType')!=='other')||(id==='sportsBrandCustom'&&get('sportsBrand')!=='Other / Unknown');controls.get(id).disabled=busy||!enabled.checked||!visible[group];controls.get(id).required=enabled.checked&&visible[group]&&required.has(id)}
  fields.disabled=busy||!enabled.checked;enabled.disabled=busy;
 }
 fields.addEventListener('change',e=>{
  const id=[...controls].find(([,el])=>el===e.target)?.[0];
  if(id==='listingType'){
   set('category',defaults[get(id)]||'other');
   if(get(id)==='console')set('consoleItemType','Console');
  }
  // Hardware subtype determines the buyer-facing category; don't ask twice.
  if(id==='consoleItemType'&&get('listingType')==='console')set('category',({Console:'consoles',Controller:'controllers',Accessory:'accessories'})[get(id)]||'consoles');
  // 'Other' intentionally keeps its explicit category choice, including games/cards.
  if(id==='category'&&get('listingType')!=='other'&&!allowed[get(id)]?.includes(get('listingType')))set('listingType',allowed[get(id)]?.[0]||'other');
  if(id==='sportsBrand'&&get(id)!=='Other / Unknown')set('sportsBrandCustom','');
  if(id==='tcgGame'){
   sets();set('tcgCustomSet','');set('tcgCustomVariant','');
  }
  if(id==='tcgEra'){
   deckplayFillOptions(controls.get('tcgSet'),deckplaySets[get('tcgGame')]?.[get('tcgEra')]||[],'Not specified');
   set('tcgCustomSet','');
  }
  // A deliberate known selection must replace, not be silently overridden by,
  // an old custom value restored from a previous edit. Keep Other editable.
  if(id==='tcgSet'&&get(id)!=='Other / unknown')set('tcgCustomSet','');
  if(id==='tcgVariant'&&get(id)!=='Other')set('tcgCustomVariant','');
  if(id==='category'&&['consoles','controllers','accessories'].includes(get(id)))set('consoleItemType',{consoles:'Console',controllers:'Controller',accessories:'Accessory'}[get(id)]);
  sync();
 });enabled.addEventListener('change',sync);
 const strip=listingEditorVisibleDescription;
 function reset(row={}){
  for(const [id,el]of controls){el.value='';if(id==='condition')el.value='used';if(id==='cardCondition')el.value='lightly_played'}
  enabled.checked=false;container.querySelector('details').open=false;busy=false;
  set('category',row.category||'trading_cards');set('listingType',row.product_type||allowed[get('category')]?.[0]||'single');set('tcgGame',row.tcg_game);sets();set('collectibleSubcategory',row.collectible_subcategory);set('condition',row.condition||'used');
  const contents=readListingContents(row.description);set('listingIncludedQuantity',contents.quantity);set('listingQuantityUnit',contents.unit);set('listingContentsList',contents.contents);
  const description=String(row.description||'');
  // The latest edited classification is authoritative; old seller disclosures can
  // still contain the original Set, Variant or Card condition values.
  const latest=latestEditorClassification(description);
  const line=label=>{const pattern=new RegExp('(?:^|\\n)'+label+': ([^\\n]*)');return (latest??description).match(pattern)?.[1]||''};
  for(const [id,label]of [['gamePlatform','Platform'],['consoleItemType','Hardware type'],['consoleBrand','Brand'],['consoleModel','Model'],['consoleStorage','Storage / version'],['sportsSport','Sport'],['sportsBrand','Sports brand'],['sportsProductLine','Product line'],['sportsYear','Year'],['sportsPlayer','Player'],['gradingCompany','Grader'],['gradingScore','Grade'],['gradingCert','Certification'],['tcgCardNumber','Card number'],['tcgRarity','Rarity'],['tcgEdition','Edition / printing'],['tcgLanguage','Language'],['deckLeader','Deck'],['deckCardCount','Cards']])set(id,line(label));
  // Restore optional set era before reloading its dependent set choices.
  set('tcgEra',line('Era'));
  deckplayFillOptions(controls.get('tcgSet'),deckplaySets[get('tcgGame')]?.[get('tcgEra')]||[],'Not specified');
  const restoredSet=listingEditorRestoreCatalogChoice(controls.get('tcgSet').options,line('Set'));
  set('tcgSet',restoredSet.selected);set('tcgCustomSet',restoredSet.custom);
  const restoredVariant=listingEditorRestoreCatalogChoice(controls.get('tcgVariant').options,line('Variant'));
  set('tcgVariant',restoredVariant.selected);set('tcgCustomVariant',restoredVariant.custom);
  if(get('tcgGame')==='sports_cards'){
   const restoredBrand=listingEditorRestoreSportsBrand(controls.get('sportsBrand').options,line('Sports brand')||line('Brand'));
   set('sportsBrand',restoredBrand.selected);set('sportsBrandCustom',restoredBrand.custom);
  }
  const conditionLine=line('Card condition'),options=[...controls.get('cardCondition').options];
  // Never let a legacy [Card Condition] override the latest edited value.
  const option=options.find(o=>o.textContent.trim()===conditionLine)||(!latest?options.find(o=>description.includes('[Card Condition]\n'+o.textContent.trim())):null);
  if(option)set('cardCondition',option.value);else if(row.condition==='graded')set('cardCondition','graded');else if(row.condition==='new')set('cardCondition','sealed');
  set('deckList',listingEditorLatestDeckList(description));
  if(!get('consoleItemType'))set('consoleItemType',{consoles:'Console',controllers:'Controller',accessories:'Accessory'}[get('category')]);sync();
 }
 function values(description){
  if(!enabled.checked)return null;sync();const invalid=[...controls.values()].find(el=>!el.disabled&&!el.checkValidity());if(invalid){invalid.focus();throw Error('Review '+invalid.labels?.[0]?.textContent+' before saving.')}
  const contentsBlock=listingContentsBlock({quantity:get('listingIncludedQuantity'),unit:get('listingQuantityUnit'),contents:get('listingContentsList')});
  const category=get('category'),type=get('listingType'),cards=category==='trading_cards';
  if(type==='deck'){const q=deckQuantitySummary(get('deckList')),declared=Number(get('deckCardCount'));if(q.invalid||!q.complete)throw Error('Every decklist line needs a valid quantity, such as 4x Card name, so the included card count can be verified.');if(q.total!==declared)throw Error('Deck quantities total '+q.total+' cards but the stated total is '+declared+'. Correct the decklist or card count before saving.')}
  if(type==='lot'&&!strip(description).trim())throw Error('Describe every item, quantity and condition included in the lot.');
  const lines=['Category: '+controls.get('category').selectedOptions[0].textContent,'Listing type: '+controls.get('listingType').selectedOptions[0].textContent];
  const labels={tcgEra:'Era',gamePlatform:'Platform',consoleItemType:'Hardware type',consoleBrand:'Brand',consoleModel:'Model',consoleStorage:'Storage / version',sportsSport:'Sport',sportsBrand:'Sports brand',sportsProductLine:'Product line',sportsYear:'Year',sportsPlayer:'Player',gradingCompany:'Grader',gradingScore:'Grade',gradingCert:'Certification',tcgCardNumber:'Card number',tcgRarity:'Rarity',tcgEdition:'Edition / printing',tcgLanguage:'Language',deckLeader:'Deck',deckCardCount:'Cards',deckList:'Full decklist'};
  if(cards)lines.push('Card condition: '+controls.get('cardCondition').selectedOptions[0].textContent);
  for(const [id,label]of Object.entries(labels))if(id!=='deckList'&&!controls.get(id).disabled&&get(id).trim())lines.push(label+': '+(id==='sportsBrand'?listingSportsBrandValue(get(id),get('sportsBrandCustom')):get(id)).trim());
  if(cards){const setName=get('tcgCustomSet').trim()||get('tcgSet'),variant=get('tcgCustomVariant').trim()||get('tcgVariant');if(setName)lines.push('Set: '+setName);if(variant)lines.push('Variant: '+variant)}
  // Keep the full decklist LAST so later optional set/variant metadata cannot
  // be mistaken for card rows on edit/reopen. Existing old saves still parse.
  if(type==='deck'&&get('deckList').trim())lines.push('Full decklist:\n'+get('deckList').trim());
  return {category,product_type:type,tcg_game:cards?get('tcgGame'):null,collectible_subcategory:category==='collectibles'?get('collectibleSubcategory'):null,condition:cards?({near_mint:'like_new',lightly_played:'used',moderately_played:'used',heavily_played:'damaged',damaged:'damaged',sealed:'new',graded:'graded'})[get('cardCondition')]:get('condition'),description:(contentsBlock?contentsBlock+'\n\n':'')+'[Listing classification]\n'+lines.join('\n')+'\n[End classification]\n\n'+strip(description)};
 }
 reset();return {reset,values,strip,preserve:listingEditorPreserveDescription,setBusy(value){busy=value;sync()}};
};
