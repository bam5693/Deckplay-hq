const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('index.html','utf8');
test('read receipts are limited to current user, sender, and unread rows',()=>{
 const start=source.indexOf('const markRead=async()=>');
 const end=source.indexOf('await markRead();',start);
 assert.ok(start>0&&end>start);
 const body=source.slice(start,end);
 assert.match(body,/\.in\("id",unread\)\.eq\("recipient_id",userId\)\.eq\("sender_id",id\)\.is\("read_at",null\)/);
 assert.match(body,/if\(!stillShowingThread\(\)\)return;/);
});
test('obsolete thread loads cannot change selected collector',()=>{
 const start=source.indexOf('const openThread=async (id,');
 const end=source.indexOf('document.getElementById("inboxPage").classList.add("thread-open")',start);
 assert.ok(start>0&&end>start);
 const section=source.slice(start,end);
 assert.ok(section.indexOf('if(requestId!==inboxLoadVersion||currentUser?.id!==userId)return;')<section.indexOf('selectedInboxCollector=id;'));
 assert.match(section,/x\.recipient_id===userId&&x\.sender_id===id&&!x\.read_at/);
});
