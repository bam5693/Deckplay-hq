const fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync('dist-release-preview/release-manifest.json','utf8'));
if(manifest.environment!=='isolated-preview')throw Error('Preview must use isolated database');
const assets={};
for(const name of [...Object.keys(manifest.assets),'release-manifest.json']){
 const body=fs.readFileSync('dist-release-preview/'+name,'utf8');
 if(body.includes('yffruutknztvdyioovmp'))throw Error('Production reference in preview');
 assets['/'+name]={body,type:name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.webmanifest')?'application/manifest+json':'application/json'};
}
fs.writeFileSync('dist-release-preview-worker.mjs','const assets='+JSON.stringify(assets)+';\n'+fs.readFileSync('scripts/release-preview-handler.mjs','utf8'));
console.log('Prepared isolated preview with existing staging access gate and '+Object.keys(assets).length+' assets');
