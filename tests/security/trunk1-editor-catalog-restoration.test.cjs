'use strict';
// Scoped seller-edit regression: no database, browser or physical-device acceptance.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../listing-editor-classification.js'),'utf8');

function mount(description,game='pokemon'){
 const catalog={
  pokemon:{'Scarlet & Violet':['151','Paldea Evolved','Other / unknown']},
  one_piece:{'Main booster sets':['OP-17','Other / unknown']}
 };
 const variants={
  pokemon:['Regular','Special Illustration Rare','Other'],
  one_piece:['Regular','Manga Rare','Other']
 };
 const optionsFor=id=>({
  category:[['trading_cards','Trading cards'],['video_games','Video games'],['other','Other']],
  listingType:[['single','Single trading card'],['other','Other']],
  tcgGame:[['pokemon','Pokémon'],['one_piece','One Piece']],
  cardCondition:[['lightly_played','Lightly Played'],['near_mint','Near Mint']],
  condition:[['used','Used']],
  tcgSet:[['','Not specified']],
  tcgVariant:[['','Not specified']]
 }[id]||[]).map(([value,textContent])=>({value,textContent}));
 const make=(id='')=>({
  id,value:'',options:optionsFor(id),children:[],disabled:false,required:false,hidden:false,
  cloneNode(){const c=make(id);c.options=this.options.map(x=>({...x}));return c},
  removeAttribute(){},append(...children){this.children.push(...children)},
  checkValidity(){return true},
  get selectedOptions(){return [this.options.find(o=>o.value===this.value)||{value:this.value,textContent:this.value}]}
 });
 const fields=make('fieldset'),enabled=make('enabled'),details=make('details');
 fields.addEventListener=(name,fn)=>{if(name==='change')fields.change=fn};
 enabled.addEventListener=(name,fn)=>{if(name==='change')enabled.change=fn};
 const nodes=new Map();
 const doc={
  getElementById(id){if(!nodes.has(id))nodes.set(id,make(id));return nodes.get(id)},
  createElement(){return make()}
 };
 const container={
  set innerHTML(value){this.html=value},
  querySelector(selector){return selector==='fieldset'?fields:selector==='#editClassificationEnabled'?enabled:details}
 };
 const ctx={window:{},document:doc,deckplaySets:catalog,deckplayVariants:variants,
  deckplayFillOptions(el,values,placeholder){el.options=[{value:'',textContent:placeholder},...values.map(value=>({value,textContent:value}))];el.value=''},
  listingContentsBlock(){return ''},deckQuantitySummary(){return {complete:true,invalid:false,total:0}}
 };
 vm.runInNewContext(source,ctx);
 const editor=ctx.window.createListingEditorClassification(container,{});
 editor.reset({category:'trading_cards',product_type:'single',tcg_game:game,description,condition:'used'});
 enabled.checked=true;enabled.change();
 const control=id=>fields.children.map(w=>w.children[1]).find(el=>el.id==='editAttribute_'+id);
 const change=(id,value)=>{const el=control(id);el.value=value;fields.change({target:el})};
 return {editor,control,change};
}
const block=lines=>'[Listing classification]\\n'+lines.join('\\n')+'\\n[End classification]';

test('Jayden: known Pokémon set and variant reopen as selects, not hidden custom overrides',()=>{
 const ui=mount(block(['Era: Scarlet & Violet','Set: 151','Variant: Special Illustration Rare']));
 assert.equal(ui.control('tcgSet').value,'151');
 assert.equal(ui.control('tcgCustomSet').value,'');
 assert.equal(ui.control('tcgVariant').value,'Special Illustration Rare');
 assert.equal(ui.control('tcgCustomVariant').value,'');
 ui.change('tcgSet','Paldea Evolved');ui.change('tcgVariant','Regular');
 const saved=ui.editor.values('Original sleeve notes').description;
 assert.match(saved,/Set: Paldea Evolved/);
 assert.match(saved,/Variant: Regular/);
 assert.doesNotMatch(saved,/Set: 151|Variant: Special Illustration Rare/);
});

test('Jayden: unlisted Japanese promo stays editable and a new selected set replaces it',()=>{
 const ui=mount(block(['Era: Scarlet & Violet','Set: Japanese event promo','Variant: Textured foil']));
 assert.equal(ui.control('tcgSet').value,'');
 assert.equal(ui.control('tcgCustomSet').value,'Japanese event promo');
 assert.equal(ui.control('tcgCustomVariant').value,'Textured foil');
 ui.change('tcgSet','151');ui.change('tcgVariant','Regular');
 assert.equal(ui.control('tcgCustomSet').value,'');
 assert.equal(ui.control('tcgCustomVariant').value,'');
 assert.match(ui.editor.values('Original sleeve notes').description,/Set: 151/);
});

test('Jayden: switching games and eras clears unrelated hidden custom metadata',()=>{
 const ui=mount(block(['Era: Scarlet & Violet','Set: Japanese event promo','Variant: Textured foil']));
 ui.change('tcgGame','one_piece');
 assert.equal(ui.control('tcgCustomSet').value,'');
 assert.equal(ui.control('tcgCustomVariant').value,'');
 ui.change('tcgEra','Main booster sets');
 ui.change('tcgSet','OP-17');ui.change('tcgVariant','Manga Rare');
 const saved=ui.editor.values('One Piece card notes').description;
 assert.match(saved,/Set: OP-17/);
 assert.match(saved,/Variant: Manga Rare/);
 assert.doesNotMatch(saved,/Japanese event promo|Textured foil|151/);
});

test('Tanner: explicit Other set/variant preserves seller-entered exact printing',()=>{
 const ui=mount(block(['Era: Scarlet & Violet','Set: 151','Variant: Regular']));
 ui.change('tcgSet','Other / unknown');
 ui.control('tcgCustomSet').value='Limited Pokémon Center promo';
 ui.change('tcgVariant','Other');
 ui.control('tcgCustomVariant').value='Stamped holo';
 const saved=ui.editor.values('Factory sealed sleeve').description;
 assert.match(saved,/Set: Limited Pokémon Center promo/);
 assert.match(saved,/Variant: Stamped holo/);
 ui.change('tcgSet','Paldea Evolved');ui.change('tcgVariant','Regular');
 const updated=ui.editor.values('Factory sealed sleeve').description;
 assert.doesNotMatch(updated,/Limited Pokémon Center promo|Stamped holo/);
});

test('Reopen after corrected edit restores new set, variant and authored notes',()=>{
 const ui=mount(block(['Era: Scarlet & Violet','Set: 151','Variant: Regular']));
 ui.change('tcgSet','Paldea Evolved');ui.change('tcgVariant','Special Illustration Rare');
 const updated=ui.editor.values('Small edge mark').description;
 const reopened=mount(updated);
 assert.equal(reopened.control('tcgSet').value,'Paldea Evolved');
 assert.equal(reopened.control('tcgVariant').value,'Special Illustration Rare');
 assert.equal(reopened.editor.strip(updated),'Small edge mark');
});
