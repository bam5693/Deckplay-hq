// V1 release-gate screenshots ONLY. Never send real customer data or arbitrary URLs.
export const VISION_MODEL='@cf/meta/llama-3.2-11b-vision-instruct';
export const VISION_LEADS=['Tanner','Jayden'];
export const CASE_IDS=['v1-sell-deck-light','v1-sell-deck-dark','v1-sell-game-light','v1-sell-game-dark','v1-sell-sports-light','v1-sell-sports-dark'];
const MAX_IMAGE_BYTES=750000;
export function validateVisionRequest(data){
 if(!data||!VISION_LEADS.includes(data.lead))throw Error('Invalid reviewer');
 if(!CASE_IDS.includes(data.caseId))throw Error('Not an approved V1 case');
 if(typeof data.image!=='string'||data.image.length<200||data.image.length>1050000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data.image))throw Error('Invalid screenshot');
 const raw=data.image.split(',')[1];
 const bytes=Math.floor(raw.length*3/4)-(raw.endsWith('==')?2:raw.endsWith('=')?1:0);
 if(bytes>MAX_IMAGE_BYTES)throw Error('Screenshot too large');
 if(typeof data.goal!=='string'||data.goal.length<10||data.goal.length>200)throw Error('Invalid customer goal');
 return {image:raw,goal:data.goal.trim(),lead:data.lead,caseId:data.caseId};
}
export function visionPrompt(data){
 return [
  'Act as '+data.lead+', an independent skeptical DeckPlay HQ collector reviewing a single actual EMULATED mobile screenshot, not a live physical phone.',
  data.lead==='Tanner'?'Specialty: sports cards, hockey, historical manufacturers versus product brands, raw/graded, and seller confidence.':'Specialty: Pokemon, One Piece, deck building, games, hardware, and buyer discovery.',
  'Customer goal: '+data.goal+'. Approved case: '+data.caseId+'.',
  'Look at actual visible pixels: detect circular or inconsistent Cancel buttons, unreadable light/dark contrast, overlapping or clipped content, confusing labels, excessive form clutter, irrelevant card/foil help on games, and double category questions.',
  'Do not claim to have navigated or clicked the site. A screenshot alone cannot verify hidden fields, account boundaries, functionality or correct product data. Do not guess; write NOT VISIBLE when appropriate.',
  'Answer concisely: VISIBLE FINDINGS (up to 3); BLOCKER/MAJOR/MINOR/NONE; WHAT EXACTLY IN IMAGE proves it; SUGGESTED FIX; UNVERIFIED. A model response is advisory, not a release approval.'
 ].join('\n');
}
export async function reviewVision(ai,input){
 const p=validateVisionRequest(input);
 if(!ai||typeof ai.run!=='function')throw Error('AI binding unavailable');
 const result=await ai.run(VISION_MODEL,{messages:[{role:'user',content:visionPrompt(p)}],image:p.image,max_tokens:450,temperature:0.1});
 if(typeof result?.response!=='string'||!result.response.trim())throw Error('No vision response');
 return {lead:p.lead,caseId:p.caseId,model:VISION_MODEL,report:result.response.trim(),reviewStatus:'ADVISORY_ONLY'};
}
