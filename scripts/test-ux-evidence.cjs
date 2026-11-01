const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deckplay-uxgate-'));
const script=path.resolve('scripts/check-ux-evidence.cjs');
function check(name,files,body,want){
 const event=path.join(dir,'event.json'),changed=path.join(dir,'files.json');
 fs.writeFileSync(event,JSON.stringify({pull_request:{body}}));
 fs.writeFileSync(changed,JSON.stringify(files.map(filename=>({filename}))));
 const r=spawnSync(process.execPath,[script,changed],{env:{...process.env,GITHUB_EVENT_PATH:event},encoding:'utf8'});
 if((r.status===0)!==want)throw Error(name+' unexpected status '+r.status+' '+r.stdout+' '+r.stderr);
 console.log('PASS '+name);
}
const evidence=`## UX ACCEPTANCE
UX status: ACCEPTED
Reviewer: @independent-reviewer
Evidence: https://github.com/bam5693/Deckplay-hq/actions/runs/123
Jayden and Tanner reviewed the changed journey.
Mobile light and dark checked.
`;
try{
 check('docs-only skips', ['docs/README.md'],'',true);
 check('customer UI without evidence fails',['index.html'],'',false);
 check('default BLOCKED fails',['index.html'],evidence.replace('ACCEPTED','BLOCKED'),false);
 check('blank reviewer fails',['index.html'],evidence.replace('Reviewer: @independent-reviewer','Reviewer: '),false);
 check('blank evidence fails',['index.html'],evidence.replace('Evidence: https://github.com/bam5693/Deckplay-hq/actions/runs/123','Evidence: '),false);
 check('complete review passes',['index.html'],evidence,true);
}finally{fs.rmSync(dir,{recursive:true,force:true})}
