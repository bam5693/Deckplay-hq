// curl uses the workspace's system trust/proxy configuration. Secrets travel via stdin.
const {execFileSync}=require('node:child_process');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function http(url,{method='GET',headers={},body}={}) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deckplay-http-'));
 try {
  const config=['silent','show-error','max-time = 30','request = '+JSON.stringify(method),'url = '+JSON.stringify(url),'write-out = "\\n%{http_code}"'];
  for(const [k,v] of Object.entries(headers))config.push('header = '+JSON.stringify(k+': '+v));
  if(body!==undefined){const file=path.join(dir,'body');fs.writeFileSync(file,typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body),{mode:0o600});config.push('data-binary = '+JSON.stringify('@'+file))}
  const output=execFileSync('curl',['--config','-'],{input:config.join('\n'),encoding:'utf8',maxBuffer:5*1024*1024});
  const split=output.lastIndexOf('\n'),status=Number(output.slice(split+1)),raw=output.slice(0,split);let data;try{data=JSON.parse(raw)}catch{data=raw}
  return {status,data};
 } finally {fs.rmSync(dir,{recursive:true,force:true})}
}
module.exports={http};
// Concurrent variant for acceptance-race tests; credentials remain on stdin.
const {execFile}=require('node:child_process');
function httpAsync(url,{method='GET',headers={},body}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deckplay-http-'));
 const config=['silent','show-error','max-time = 30','request = '+JSON.stringify(method),'url = '+JSON.stringify(url),'write-out = "\\n%{http_code}"'];
 for(const [k,v] of Object.entries(headers))config.push('header = '+JSON.stringify(k+': '+v));
 if(body!==undefined){const file=path.join(dir,'body');fs.writeFileSync(file,JSON.stringify(body),{mode:0o600});config.push('data-binary = '+JSON.stringify('@'+file))}
 return new Promise((resolve,reject)=>{const child=execFile('curl',['--config','-'],{encoding:'utf8'},(error,output)=>{fs.rmSync(dir,{recursive:true,force:true});if(error){reject(new Error('Concurrent HTTP request failed'));return}const i=output.lastIndexOf('\n');resolve({status:Number(output.slice(i+1)),data:output.slice(0,i)})});child.stdin.end(config.join('\n'))});
}
module.exports.httpAsync=httpAsync;
