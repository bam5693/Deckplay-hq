const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('scripts/release-preflight.cjs','utf8');
function run(overrides={}){
 const state={branch:'main',head:'approved-sha',index:'approved-index',approvedSHA:'approved-sha',gates:{approvedApplicationTree:'approved-index',productionSchemaVerified:true,previewAcceptanceVerified:true,rollbackVerified:true,blockers:[]},...overrides};
 const fakeFS={...fs,readFileSync:(file,...args)=>file==='release/gates.json'?JSON.stringify(state.gates):fs.readFileSync(file,...args)};
 const child={execFileSync:(_cmd,args)=>args[0]==='branch'?state.branch:args[0]==='rev-parse'?(args[1].includes(':')?state.index:state.head):''};
 vm.runInNewContext(source,{require:name=>name==='node:fs'?fakeFS:name==='node:child_process'?child:name==='../release/assets.json'?require('../../release/assets.json'):require(name),process:{argv:['node','release-preflight','--publish'],execPath:process.execPath,env:{DECKPLAY_APPROVED_RELEASE_SHA:state.approvedSHA}},console:{log(){}}});
}
test('publication refuses unresolved production schema, preview and recovery gates',()=>{
 for(const key of ['productionSchemaVerified','previewAcceptanceVerified','rollbackVerified'])assert.throws(()=>run({gates:{approvedApplicationTree:'approved-index',productionSchemaVerified:true,previewAcceptanceVerified:true,rollbackVerified:true,blockers:[],[key]:false}}),/Release gates/);
});
test('publication refuses a nonempty blocker list',()=>assert.throws(()=>run({gates:{approvedApplicationTree:'approved-index',productionSchemaVerified:true,previewAcceptanceVerified:true,rollbackVerified:true,blockers:['schema mismatch']}}),/schema mismatch/));
test('publication refuses staging and stale application approval',()=>{
 assert.throws(()=>run({branch:'test/staging-reporting'}),/restricted to main/);
 assert.throws(()=>run({index:'different-index'}),/does not match this tree/);
});
test('publication requires the exact explicitly approved commit',()=>assert.throws(()=>run({approvedSHA:'old-sha'}),/approved commit SHA/));
test('publication gate accepts only a matching complete approval receipt',()=>assert.doesNotThrow(()=>run()));
