const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
test('small-screen Inbox composer has 16px minimum font to prevent focus zoom',()=>{
 const style=html.match(/@media\(max-width:700px\)\{#inboxPage \.chat-composer textarea\{([^}]*)\}\}/);
 assert.ok(style,'Expected scoped mobile Inbox composer rule');
 assert.match(style[1],/font-size:\s*max\(16px,1em\)\s*;/);
 assert.match(style[1],/touch-action:\s*manipulation/);
});
test('mobile conversation remains compatible with bottom-dock safe area',()=>{
 assert.match(html,/#inboxPage\.thread-open \.chat-composer\s*\{[^}]*bottom:\s*calc\(80px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
});

test('editable mobile fields avoid iOS focus zoom and preserve enlarged user text',()=>{
 const rule=html.match(/\/\* T5: editable mobile fields inherit 15px body text;[\s\S]*?\*\/\s*(@media\(max-width:700px\)\{[\s\S]*?\})\s*\}/);
 assert.ok(rule,'Expected shared mobile text-field rule');
 for(const type of ['text','email','password','search','number','tel','url','date','datetime-local','time']){
  assert.ok(rule[1].includes('[type='+type+']'),'Missing '+type+' mobile input support');
 }
 assert.match(rule[1],/textarea,select\{font-size:max\(16px,1em\)\}/);
 assert.doesNotMatch(rule[1],/\[type=(checkbox|radio|file|range|hidden|submit|reset|button)\]/);
});

test('mobile dock navigation captions remain readable within six-column layout',()=>{
 const rule=html.match(/#mobileDock>button>small\{([^}]*)\}/);
 assert.ok(rule,'Mobile dock label rule exists');
 assert.match(rule[1],/font-size:11px!important/);
 assert.match(html,/#mobileDock\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
});
