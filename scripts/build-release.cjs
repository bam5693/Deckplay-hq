// Explicit public assets only. Never deploy the repository directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const preview=process.argv.includes('--preview');
const source=preview?'dist-staging':'.',target=preview?'dist-release-preview':'dist-release';
const assets=require('../release/assets.json');
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
const hashes={};
for(const name of assets){
 if(!/^(?:[a-z0-9-]+\.(?:html|js|svg|webmanifest)|vendor\/supabase-[0-9.]+\.js)$/.test(name))throw Error('Unexpected public asset '+name);
 let content=fs.readFileSync(path.join(source,name));
 // Preview and production share the same exclusions. The staging-only photo endpoint
 // accepts only the staging origin; enabling this on a second origin would be broken.
 if(name==='private-message-photos.js')content=Buffer.from(content.toString('utf8').replace("enabled=()=>SUPABASE_URL==='https://prrrzeelltmyugssqnzk.supabase.co'","enabled=()=>false"));
 const text=content.toString('utf8');
 if(/sb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY/.test(text))throw Error('Secret-like content in '+name);
 for(const [jwt] of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){
  let payload;try{payload=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString())}catch{continue}
  if(payload.role==='service_role')throw Error('Privileged JWT in '+name);
 }
 if(preview?text.includes('yffruutknztvdyioovmp'):text.includes('prrrzeelltmyugssqnzk'))throw Error('Wrong database in '+name);
 const out=path.join(target,name);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,content);
 hashes[name]=crypto.createHash('sha256').update(content).digest('hex');
}
// Local links must resolve inside the allowlist; remote image/catalog references stay remote.
for(const name of assets.filter(n=>n.endsWith('.html'))){
 const html=fs.readFileSync(path.join(target,name),'utf8').replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi,'$1</script>');
 for(const [,value] of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){
  if(/^(?:https?:|data:|blob:|#|mailto:|tel:)/.test(value))continue;
  const clean=value.split(/[?#]/)[0].replace(/^\.\//,'').replace(/^\//,'');
  if(clean&&!assets.includes(clean))throw Error(name+' references unbundled asset '+value);
 }
}
const git=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const treeHash=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
fs.writeFileSync(path.join(target,'release-manifest.json'),JSON.stringify({sourceCommit:git,environment:preview?'isolated-preview':'production',assetTreeHash:treeHash,assets:hashes},null,2)+'\n');
fs.writeFileSync(path.join(target,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/index.html\n  Cache-Control: no-cache\n/*.js\n  Cache-Control: no-cache\n');
console.log(JSON.stringify({target,assets:assets.length,treeHash,preview}));
