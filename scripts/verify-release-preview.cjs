const fs=require('node:fs'),crypto=require('node:crypto');
const origin='https://deckplay-hq-release-preview.cstivers56.workers.dev';
(async()=>{
 const anonymous=await fetch(origin,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(anonymous.status!==401||!anonymous.headers.get('www-authenticate')?.includes('Basic'))throw Error('Preview anonymous boundary failed');
 const password=process.env.DECKPLAY_STAGING_ACCESS_PASSWORD;
 if(!password||/[\r\n]/.test(password))throw Error('Trusted preview credentials missing');
 const signed=await fetch(origin,{headers:{Authorization:'Basic '+Buffer.from('deckplay:'+password).toString('base64')},redirect:'error',signal:AbortSignal.timeout(20000)});
 if(signed.status!==200)throw Error('Preview Basic Auth HTTP '+signed.status+'; stop before browser testing');
 const actual=Buffer.from(await signed.arrayBuffer()),expected=fs.readFileSync('dist-release-preview/index.html');
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 if(hash(actual)!==hash(expected))throw Error('Preview differs from pinned source');
 if(!actual.includes('https://prrrzeelltmyugssqnzk.supabase.co')||actual.includes('https://yffruutknztvdyioovmp.supabase.co'))throw Error('Preview database mismatch');
 console.log('PASS preview: anonymous 401; signed 200; homepage matches pinned release; isolated DB binding');
})().catch(e=>{console.error(e.message);process.exitCode=1});
