import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LEADS,MODEL,buildReview,reviewWithAI} from '../../scripts/ai-leads.mjs';
const evidence='Synthetic staging buyer offered $19, seller accepted, listing locked, and inbox refreshed on mobile; buyer saw stale offer status.';
test('Tanner and Jayden have distinct read-only reviewer prompts',()=>{
 assert.equal(Object.keys(LEADS).length,2);
 assert.match(MODEL,/^@cf\//);
 for(const lead of ['Tanner','Jayden']){
  const messages=buildReview(lead,evidence);
  assert.match(messages[0].content,/Never claim you clicked/);
  assert.match(messages[0].content,/No code changes/);
 }
 assert.notEqual(buildReview('Tanner',evidence)[0].content,buildReview('Jayden',evidence)[0].content);
});
test('untrusted reviewer names and missing AI binding fail closed',async()=>{
 assert.throws(()=>buildReview('Manager',evidence),/Unknown reviewer/);
 await assert.rejects(()=>reviewWithAI(null,'Tanner',evidence),/binding unavailable/);
});
test('both leads can request actual inference from a provided binding',async()=>{
 const called=[];
 const ai={run:async(model,params)=>{called.push({model,params});return {response:'Issue: buyer status stale after seller accepted'};}};
 for(const lead of ['Tanner','Jayden']){
  const result=await reviewWithAI(ai,lead,evidence);
  assert.equal(result.lead,lead);
  assert.match(result.report,/buyer status stale/);
 }
 assert.equal(called.length,2);
});
