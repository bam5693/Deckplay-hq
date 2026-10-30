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
   // Cloudflare's new version can propagate to different isolates asynchronously.
   // Retry ONLY mismatches, with a fixed 7-read cap (~32s maximum settling);
   // every byte must STILL match the tested source before acceptance.
   let match=false,lastRead=null;
   for(let attempt=0;attempt<7;attempt++){
    if(attempt)await new Promise(resolve=>setTimeout(resolve,1500*attempt));
    const response=await fetch(origin+'/'+relative,{headers:{...headers,'Cache-Control':'no-cache'},redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200,'Asset unavailable: '+relative);
    lastRead=Buffer.from(await response.arrayBuffer());
    if(lastRead.equals(expected)){match=true;break;}
   }
   if(!match){
    const hash=value=>require('node:crypto').createHash('sha256').update(value).digest('hex').slice(0,20);
    throw Error('Deployed asset differs after bounded retries: '+relative+
      ' expected='+expected.length+'B/'+hash(expected)+' observed='+lastRead.length+'B/'+hash(lastRead));
   }
   count++;
  }
 }
 await verify('dist-staging');
 console.log('Exact served-asset parity passed: '+count+' assets; anonymous staging denied.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
