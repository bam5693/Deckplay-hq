const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
test('small-screen Inbox composer has 16px minimum font to prevent focus zoom',()=>{
 const style=html.match(/@media\(max-width:700px\)\{#inboxPage \.chat-composer textarea\{([^}]*)\}\}/);
 assert.ok(style,'Expected scoped mobile Inbox composer rule');
 assert.match(style[1],/font-size:\s*16px\s*;/);
 assert.match(style[1],/touch-action:\s*manipulation/);
});
test('mobile conversation remains compatible with bottom-dock safe area',()=>{
 assert.match(html,/#inboxPage\.thread-open \.chat-composer\s*\{[^}]*bottom:\s*calc\(80px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
});
