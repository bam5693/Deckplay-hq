const fs=require('node:fs'),{spawnSync}=require('node:child_process');const env={...process.env};
if(fs.existsSync('.staging-credentials.json')){
 const c=JSON.parse(fs.readFileSync('.staging-credentials.json'));
 env.DECKPLAY_STAGING_URL='https://deckplay-hq-staging.cstivers56.workers.dev';env.DECKPLAY_STAGING_ACCESS_PASSWORD=c.access_password;
 for(const role of ['seller','buyer']){env['DECKPLAY_TEST_'+role.toUpperCase()+'_EMAIL']='deckplay-'+role+'@deckplay.test';env['DECKPLAY_TEST_'+role.toUpperCase()+'_PASSWORD']=c[role+'_password']}
}
const r=spawnSync('npx',['playwright','test','--config=playwright.staging.config.js',...process.argv.slice(2)],{env,stdio:'inherit'});process.exit(r.status??1);
