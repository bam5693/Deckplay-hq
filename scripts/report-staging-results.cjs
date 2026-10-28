const fs=require('node:fs');const {http}=require('./staging-http.cjs');
const origin='https://prrrzeelltmyugssqnzk.supabase.co';const key='sb_publishable_0omvNnv_ZOvXrZ-LHPMyIQ_a9zxD-yh';
const headers={apikey:key,'Content-Type':'application/json'};
const {expectedMfaMobileSkips}=require('./staging-result-summary.cjs');
try{
 const tap=fs.existsSync('test-results/staging-api.tap')?fs.readFileSync('test-results/staging-api.tap','utf8'):'';
 const xml=fs.existsSync('test-results/staging-junit.xml')?fs.readFileSync('test-results/staging-junit.xml','utf8'):'';
 const api=[...tap.matchAll(/^ok \d+ - (.+)$/gm)].map(x=>'API: '+x[1]);
 const root=xml.match(/<testsuites\b[^>]*>/)?.[0]||'';
 const count=name=>Number(root.match(new RegExp('\\b'+name+'="(\\d+)"'))?.[1]||0);
 const browser=count('tests'),failures=count('failures'),skipped=count('skipped'),errors=count('errors');
 const url='https://github.com/bam5693/Deckplay-hq/actions/runs/'+process.env.GITHUB_RUN_ID;
 const passed=process.env.STAGING_JOB_STATUS==='success'&&api.length>=16&&!/^not ok /m.test(tap)&&browser>=16&&failures===0&&errors===0&&skipped===expectedMfaMobileSkips(xml);
 const login=http(origin+'/auth/v1/token?grant_type=password',{method:'POST',headers,body:{email:process.env.DECKPLAY_TEST_SELLER_EMAIL,password:process.env.DECKPLAY_TEST_SELLER_PASSWORD}});
 if(login.status!==200||!login.data?.access_token)throw Error('Report login failed');
 const result=http(origin+'/rest/v1/staging_test_runs',{method:'POST',headers:{...headers,Authorization:'Bearer '+login.data.access_token},body:{user_id:login.data.user.id,suite:'github-staging-feature-bots',passed,checks:[...api,'Browser cases: '+browser+'; failures: '+failures+'; skipped: '+skipped,url],error:passed?null:'Feature workflow incomplete or failed; inspect '+url}});
 if(result.status!==201)throw Error('Report persistence failed');
 console.log('Durable staging feature report saved. Passed: '+passed);
 if(!passed)process.exitCode=1;
}catch{console.error('Could not save complete staging feature evidence. No credentials logged.');process.exitCode=1}
