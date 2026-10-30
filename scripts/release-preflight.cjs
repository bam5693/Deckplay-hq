// Cheap checks run before installing browsers or using deployment credentials.
const fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const assets=require('../release/assets.json');
for(const file of assets){
 const source=fs.readFileSync(file,'utf8');
 if(file.endsWith('.js'))new vm.Script(source,{filename:file});
 if(file.endsWith('.html'))for(const [,attrs,code] of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(/\bsrc\s*=/.test(attrs)||/type=["'](?:module|application\/ld\+json)/.test(attrs))continue;
  new vm.Script(code,{filename:file});
 }
 if(/^(?:<<<<<<< |=======\s*$|>>>>>>> )/m.test(source))throw Error('Merge conflict in '+file);
}
const html=fs.readFileSync('index.html','utf8');
if(!html.includes('https://yffruutknztvdyioovmp.supabase.co'))throw Error('Production database binding missing');
if(!html.includes('ignoreDuplicates:true'))throw Error('Profile identity preservation missing');
if(/\\n#inboxPage/.test(html))throw Error('Escaped newline breaks Inbox CSS');
execFileSync(process.execPath,['scripts/build-release.cjs'],{stdio:'inherit'});
if(process.argv.includes('--publish')){
 const gates=JSON.parse(fs.readFileSync('release/gates.json','utf8'));
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
 if(branch!=='main')throw Error('Production deployment is restricted to main');
 if(gates.approvedApplicationTree!==execFileSync('git',['rev-parse','HEAD:index.html'],{encoding:'utf8'}).trim())throw Error('Application approval does not match this tree');
 if(gates.blockers.length||gates.productionSchemaVerified!==true||gates.previewAcceptanceVerified!==true||gates.rollbackVerified!==true)throw Error('Release gates remain unresolved: '+gates.blockers.join('; '));
 if(process.env.DECKPLAY_APPROVED_RELEASE_SHA!==head)throw Error('Explicit approved commit SHA does not match checkout');
}
console.log('Release preflight passed'+(process.argv.includes('--publish')?' including publication gates':' (publication gates not asserted)'));
