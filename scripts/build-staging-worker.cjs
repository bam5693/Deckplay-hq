// Bundles only built staging assets behind a mandatory secret. No production routes.
const fs=require('node:fs'),path=require('node:path');
const files={};
function collect(dir,prefix='') {
 for(const name of fs.readdirSync(dir)) {
  const full=path.join(dir,name),relative=prefix+name;
  if(fs.statSync(full).isDirectory()){collect(full,relative+'/');continue}
  const type=({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','svg':'image/svg+xml','webmanifest':'application/manifest+json','txt':'text/plain; charset=utf-8'})[name.split('.').pop()];
  if(!type)throw Error('Unexpected asset type: '+name);
  files['/'+relative]={body:fs.readFileSync(full,'utf8'),type};
 }
}
collect('dist-staging');
if(JSON.stringify(files).includes('yffruutknztvdyioovmp'))throw Error('Production project in staging');
const handler=fs.readFileSync('scripts/staging-handler.js','utf8');
// The publishable key is already present in the built browser app. Extract it
// from the verified staging assets, never from a secret/service-role binding.
const publicKey=files['/index.html']?.body.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
if(!publicKey)throw Error('No staging publishable key in built assets');
const preview=fs.readFileSync('scripts/staging-share-preview.js','utf8');
fs.writeFileSync('dist-staging-worker.mjs','const assets='+JSON.stringify(files)+';\n'+
 'const STAGING_PREVIEW_PUBLIC_KEY='+JSON.stringify(publicKey)+';\n'+
 fs.readFileSync('scripts/staging-health.js','utf8')+'\n'+
 fs.readFileSync('scripts/staging-features.js','utf8')+'\n'+
 fs.readFileSync('scripts/staging-oidc.mjs','utf8').replaceAll('export async function','async function')+'\n'+preview+'\n'+handler);
console.log('Built private staging Worker');
