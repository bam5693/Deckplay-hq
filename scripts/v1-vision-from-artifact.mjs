// Run ONLY in a manually dispatched, read-only V1 screenshot review Action.
import fs from 'node:fs';
import path from 'node:path';
import {CASE_IDS} from './vision-review.mjs';
const root=process.argv[2];
if(!root||!fs.statSync(root).isDirectory())throw Error('Expected extracted V1 browser test artifact directory');
const conf=[
 {caseId:'v1-sell-deck-light',lead:'Jayden',goal:'List a complete playable One Piece deck',file:'Jayden-deck-light.png'},
 {caseId:'v1-sell-deck-dark',lead:'Jayden',goal:'List a complete playable One Piece deck',file:'Jayden-deck-dark.png'},
 {caseId:'v1-sell-game-light',lead:'Jayden',goal:'List a Nintendo Switch 2 video game',file:'Jayden-game-light.png'},
 {caseId:'v1-sell-game-dark',lead:'Jayden',goal:'List a Nintendo Switch 2 video game',file:'Jayden-game-dark.png'},
 {caseId:'v1-sell-sports-light',lead:'Tanner',goal:'List a vintage O-Pee-Chee hockey card',file:'Tanner-single-light.png'},
 {caseId:'v1-sell-sports-dark',lead:'Tanner',goal:'List a vintage O-Pee-Chee hockey card',file:'Tanner-single-dark.png'}
];
function collect(dir,found=[]){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())collect(p,found);else if(d.isFile()&&p.endsWith('.png'))found.push(p)}return found}
const screenshots=collect(root);
if(!screenshots.length)throw Error('No screenshots were uploaded; visual review BLOCKED');
if(!process.env.REVIEWER_TOKEN||!process.env.VISION_REVIEWER_URL)throw Error('Private review credentials unavailable');
const reports=[];
for(const c of conf){
 if(!CASE_IDS.includes(c.caseId))throw Error('Unapproved case');
 const hits=screenshots.filter(f=>path.basename(f)===c.file);
 if(hits.length!==1)throw Error('Missing/ambiguous V1 screenshot '+c.file);
 const buffer=fs.readFileSync(hits[0]);
 if(buffer.length>750000||buffer.length<200||buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG '+c.file);
 const image='data:image/png;base64,'+buffer.toString('base64');
 const res=await fetch(process.env.VISION_REVIEWER_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.REVIEWER_TOKEN},body:JSON.stringify({mode:'v1_vision',lead:c.lead,caseId:c.caseId,goal:c.goal,image})});
 const body=await res.json().catch(()=>({}));
 if(!res.ok||body.model!=='@cf/meta/llama-3.2-11b-vision-instruct'||typeof body.report!=='string')throw Error('Vision reviewer unavailable or wrong model at '+c.caseId+' HTTP '+res.status);
 reports.push({caseId:c.caseId,lead:c.lead,model:body.model,report:body.report,classification:'AI_ADVISORY_NOT_RELEASE_APPROVAL'});
 console.log(c.caseId+': AI vision review received ('+body.report.length+' characters)');
}
fs.writeFileSync('v1-vision-advisory.json',JSON.stringify({reviewStatus:'INDEPENDENT_HUMAN_REVIEW_REQUIRED',source:'GitHub V1 synthetic screenshot artifacts',reports},null,2));
console.log('V1 vision completed. Independent acceptance and real Android still required.');
