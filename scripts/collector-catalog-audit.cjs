#!/usr/bin/env node
// Zero-network, zero-AI-cost snapshot audit. A dropdown match is NOT buyer/seller acceptance.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
function choicesFor(catalog,check){
  if(Object.hasOwn(catalog.controls,check.field))return catalog.controls[check.field];
  const game=catalog.dependent.find(x=>x.game===check.game);
  if(check.field==='tcgEra')return game?.eras ?? null;
  if(check.field==='tcgVariant')return game?.variants ?? null;
  if(check.field==='tcgSet')return game?.sets.find(x=>x.era===check.era)?.options ?? null;
  return null; // NOT_TRACKED, not proof the UI lacks this field
}
function audit(catalog,bank){
  if(!Array.isArray(bank.cases)||bank.cases.length<10)throw Error('Insufficient challenge coverage');
  const ids=new Set();
  const cases=bank.cases.map(c=>{
    if(ids.has(c.id))throw Error('Duplicate challenge '+c.id);
    ids.add(c.id);
    if(!c.lead||!c.domain||!c.goal||!c.pitfall||!Array.isArray(c.options)||!c.options.length||!c.journey?.length||!c.negative?.length)throw Error('Incomplete challenge '+c.id);
    const checks=c.options.map(check=>{
      const opts=choicesFor(catalog,check);
      const status=opts===null?'NOT_TRACKED':opts.some(x=>x.value===check.value||x.label===check.value)?'PRESENT':'MISSING_IN_SNAPSHOT';
      return {...check,status};
    });
    return {id:c.id,lead:c.lead,domain:c.domain,goal:c.goal,pitfall:c.pitfall,checks,buyerSellerAcceptance:'NOT_TESTED_BY_SNAPSHOT'};
  });
  const counts={PRESENT:0,MISSING_IN_SNAPSHOT:0,NOT_TRACKED:0};
  for(const c of cases)for(const check of c.checks)counts[check.status]++;
  return {scope:'Static category fixture ONLY. Independent signed staging seller→buyer journey, mobile visuals and product knowledge still required.',cases,counts,challengeCount:cases.length};
}
if(require.main===module){
  const result=audit(load('tests/fixtures/category-catalog.json'),load('tests/fixtures/collector-challenges.json'));
  if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
  else{
    console.log('COLLECTOR CATALOG SNAPSHOT AUDIT — not live UX acceptance');
    console.log('Challenges:',result.challengeCount,'Present options:',result.counts.PRESENT,'Missing options:',result.counts.MISSING_IN_SNAPSHOT,'Not tracked in fixture:',result.counts.NOT_TRACKED);
    for(const c of result.cases){
      const gaps=c.checks.filter(v=>v.status!=='PRESENT');
      if(gaps.length)console.log(c.id+': '+gaps.map(x=>x.field+'='+x.value+' ['+x.status+']').join('; '));
    }
    console.log('Next: independently inspect each high-priority gap in the live staging seller form AND buyer search before changing catalogs. Do not treat the fixture as an authoritative UI inventory.');
  }
  if(process.argv.includes('--fail-on-missing')&&result.counts.MISSING_IN_SNAPSHOT)process.exitCode=1;
}
module.exports={audit,choicesFor};
