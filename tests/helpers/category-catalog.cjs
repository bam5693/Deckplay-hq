// Runs in the actual marketplace DOM; no duplicate category registry.
function categoryCatalog(){
 const options=id=>[...document.getElementById(id).options].filter(o=>!o.disabled&&o.value).map(o=>({value:o.value,label:o.textContent.trim()}));
 const select=(id,value)=>{const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))};
 const controls={};for(const id of ['listingType','category','tcgGame','collectibleSubcategory','gamePlatform','consoleItemType','consoleBrand','sportsBrand','condition','cardCondition','gradingCompany','gradingScore','marketCategory','marketGame','marketSort'])controls[id]=options(id);
 const rows=[];const add=(fields,label)=>rows.push({key:Object.values(fields).join('/'),fields,label});
 for(const type of controls.listingType){
  select('listingType',type.value);const category=document.getElementById('category').value;
  if(category==='trading_cards')for(const game of controls.tcgGame)add({listingType:type.value,category,tcgGame:game.value},game.label+' — '+type.label);
  else if(category==='video_games')for(const platform of controls.gamePlatform)add({listingType:type.value,category,gamePlatform:platform.value},platform.label+' — test game');
  else if(category==='consoles')for(const c of controls.category.filter(c=>['consoles','controllers','accessories'].includes(c.value))){
   const itemType={consoles:'Console',controllers:'Controller',accessories:'Accessory'}[c.value];
   if(!controls.consoleItemType.some(o=>o.value===itemType))throw Error('Unknown hardware item type '+c.value);
   for(const brand of controls.consoleBrand)add({listingType:type.value,category:c.value,consoleItemType:itemType,consoleBrand:brand.value},brand.label+' — '+c.label);
  }
  else if(category==='collectibles')for(const sub of controls.collectibleSubcategory)add({listingType:type.value,category,collectibleSubcategory:sub.value},sub.label+' — test collectible');
  else add({listingType:type.value,category},type.label);
 }
 // Enumerate all game-dependent eras, sets, variants (including empty/custom fallback).
 const dependent=[];
 for(const game of controls.tcgGame){select('listingType','single');select('tcgGame',game.value);
  const eras=options('tcgEra');const variants=options('tcgVariant');const sets=[];
  for(const era of eras){select('tcgEra',era.value);sets.push({era:era.value,options:options('tcgSet')})}
  dependent.push({game:game.value,eras,sets,variants});
 }
 return {version:1,controls,dependent,rows};
}
const features=['category','subcategory','create','draft','edit','images','condition_price','publish','section','search','filters_sort','seller_profile','favorites','messaging','offers','counteroffers','trades','alerts','sold_remove','mobile'];
function emptyMatrix(catalog){return {version:1,scope:'local simulation; live checks require separate evidence',rows:catalog.rows.map(row=>({...row,personas:Object.fromEntries(['Charles','Kyle','Tanner','Jayden'].map(name=>[name,Object.fromEntries(features.map(f=>[f,'unverified']))]))}))}}
module.exports={categoryCatalog,features,emptyMatrix};
