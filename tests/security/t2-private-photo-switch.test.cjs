const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('private-message-photos.js','utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('old-account pending private photo URL never renders after account change',async()=>{
 const links=[],status={textContent:''},button={disabled:false,textContent:'View photo'};
 const node={dataset:{messagePhotos:'message-1'},isConnected:true,
   querySelectorAll:()=>links,querySelector:()=>status,append:link=>links.push(link)};
 button.closest=()=>node;
 const handlers={};const root={addEventListener:(type,fn)=>handlers[type]=fn};
 const document={getElementById:id=>id==='messageInbox'?root:null,
   querySelector:()=>null,
   createElement:tag=>({tagName:tag,prepend(){}})};
 let resolveSigned;const pending=new Promise(resolve=>resolveSigned=resolve);
 const ctx={window:{},document,currentUser:{id:'buyer-A'},SUPABASE_URL:'https://prrrzeelltmyugssqnzk.supabase.co',
   supabaseClient:{from:()=>({select:()=>({eq:()=>Promise.resolve({data:[{id:'a',object_path:'A/a.jpg'}],error:null})})}),
     storage:{from:()=>({createSignedUrl:()=>pending})}},
   URL:{revokeObjectURL:()=>{}},
   escapeHtml:x=>x};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 handlers.click({target:{closest:selector=>selector==='[data-load-message-photos]'?button:null}});
 await flush();
 ctx.currentUser={id:'seller-B'};ctx.window.privateMessagePhotos.reset();
 resolveSigned({data:{signedUrl:'https://private.example/old-photo'},error:null});
 await flush();await flush();
 assert.equal(links.length,0);assert.equal(status.textContent,'');
 assert.equal(button.disabled,true,'stale callback does not update old account DOM');
});
