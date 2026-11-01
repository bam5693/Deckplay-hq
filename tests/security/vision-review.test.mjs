import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateVisionRequest,reviewVision,VISION_MODEL,CASE_IDS,visionPrompt} from '../../scripts/vision-review.mjs';
const good={lead:'Tanner',caseId:'v1-sell-sports-dark',goal:'List a vintage O-Pee-Chee hockey card',image:'data:image/png;base64,'+'A'.repeat(400)};
test('V1-only bounded input, no arbitrary case or URL',()=>{
 const a=validateVisionRequest(good);assert.equal(a.lead,'Tanner');
 assert.equal(a.image.length,400);
 for(const change of [{caseId:'trunk4-every-test'},{lead:'Admin'},{image:'https://private.example/image.png'},{image:'data:image/png;base64,'+'A'.repeat(1050001)}]){
  assert.throws(()=>validateVisionRequest({...good,...change}));
 }
 assert.equal(CASE_IDS.length,6);
 assert.match(visionPrompt(a),/NOT VISIBLE/);
});
test('AI vision invokes actual screenshot model, fails closed without binding',async()=>{
 assert.match(VISION_MODEL,/vision/);
 await assert.rejects(()=>reviewVision(null,good),/binding unavailable/);
 let called;
 const ai={run:async(model,params)=>{called={model,params};return {response:'VISUAL FINDING: oversized circular Cancel button; verify screenshot context.'}}};
 const r=await reviewVision(ai,good);
 assert.equal(called.model,VISION_MODEL);
 assert.equal(called.params.image,'A'.repeat(400));
 assert.match(r.report,/circular Cancel/);
 assert.equal(r.reviewStatus,'ADVISORY_ONLY');
});
