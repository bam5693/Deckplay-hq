// GitHub-only, read-only parity check. Never log or redirect Basic credentials.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const origin='https://deckplay-hq-staging.cstivers56.workers.dev';
async function main(){
 assert.equal(process.env.GITHUB_REF,'refs/heads/test/staging-reporting');
 assert.equal(process.env.DECKPLAY_STAGING_URL?.replace(/\/$/,''),origin);
 const password=process.env.DECKPLAY_STAGING_ACCESS_PASSWORD;
 assert.ok(password&&!/[\r\n]/.test(password),'Staging credentials required');
 const anonymous=await fetch(origin,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});
 assert.equal(anonymous.status,401);assert.match(anonymous.headers.get('www-authenticate')||'',/^Basic/i);
 const headers={Authorization:'Basic '+Buffer.from('deckplay:'+password).toString('base64')};
 let count=0;
 async function verify(dir,prefix=''){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const relative=prefix+entry.name,local=path.join(dir,entry.name);
   if(entry.isDirectory()){await verify(local,relative+'/');continue}
   const expected=fs.readFileSync(local);
   // Cloudflare may briefly serve an earlier Worker isolate right after deployment.
   // Retry ONLY mismatched assets with a short fixed cap; never accept non-identical bytes.
   let match=false;
   for(let attempt=0;attempt<4;attempt++){
    if(attempt)await new Promise(resolve=>setTimeout(resolve,1500*attempt));
    const response=await fetch(origin+'/'+relative,{headers:{...headers,'Cache-Control':'no-cache'},redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200,'Asset unavailable: '+relative);
    if(Buffer.from(await response.arrayBuffer()).equals(expected)){match=true;break;}
   }
   assert.ok(match,'Deployed asset differs after bounded retries: '+relative);
   count++;
  }
 }
 await verify('dist-staging');
 console.log('Exact served-asset parity passed: '+count+' assets; anonymous staging denied.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
