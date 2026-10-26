const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const env={...process.env};
if(fs.existsSync('.staging-credentials.json')){const c=JSON.parse(fs.readFileSync('.staging-credentials.json'));for(const role of ['seller','buyer']){env['DECKPLAY_TEST_'+role.toUpperCase()+'_EMAIL']='deckplay-'+role+'@deckplay.test';env['DECKPLAY_TEST_'+role.toUpperCase()+'_PASSWORD']=c[role+'_password']}}
const r=spawnSync(process.execPath,['--test','--test-reporter=tap',...process.argv.slice(2),'tests/integration/staging-api.test.cjs'],{env,stdio:'inherit'});process.exit(r.status??1);
