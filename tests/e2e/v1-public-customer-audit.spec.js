// Read-only V1 customer-facing browser audit. No production URLs or credentials.
// Set DECKPLAY_QA_BASE_URL=http://127.0.0.1:8787 (or another loopback port).
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.DECKPLAY_QA_BASE_URL;
const permitted=(()=>{try{const u=new URL(base);return ['localhost','127.0.0.1','[::1]'].includes(u.hostname)&&['http:','https:'].includes(u.protocol)}catch{return false}})();
test.skip(!permitted,'Read-only QA requires explicit loopback DECKPLAY_QA_BASE_URL; never audit production by default');
const surfaces=[
 {name:'marketplace',target:'a[href*="marketplace"],[data-page="marketplace"],button:has-text("Marketplace")'},
 {name:'favorites',target:'a[href*="favorite"],button:has-text("Favorites")'},
 {name:'inbox',target:'a[href*="inbox"],button:has-text("Inbox")'},
 {name:'profile',target:'a[href*="profile"],button:has-text("Profile")'},
 {name:'sell',target:'button:has-text("Sell"),button:has-text("List Item")'},
];
test('first-time visitor explores V1 navigation with readable controls and screenshot evidence',async({page},info)=>{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const results=[];
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const surface of surfaces){
   const item=page.locator(surface.target).filter({visible:true}).first();
   const available=await item.count()>0;
   let status='missing',overflow=[],unlabeled=[];
   if(available){
    await item.click({timeout:2500}).catch(()=>{status='blocked'});
    if(status!=='blocked'){
     status='visited';
     const data=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('button,a,input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});
      return {overflow:nodes.filter(e=>{const r=e.getBoundingClientRect();return r.left< -2||r.right>innerWidth+2}).map(e=>e.id||e.getAttribute('aria-label')||e.textContent.trim().slice(0,40)).slice(0,20),unlabeled:nodes.filter(e=>['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.tagName)&&!e.getAttribute('aria-label')&&!e.getAttribute('title')&&!e.labels?.length&&!e.textContent.trim()&&e.getAttribute('type')!=='hidden').map(e=>e.id||e.outerHTML.slice(0,100)).slice(0,20)};
     });
     overflow=data.overflow;unlabeled=data.unlabeled;
     expect(overflow,surface.name+' '+theme+' has horizontally clipped controls').toEqual([]);
    }
   }
   const shot=info.outputPath('v1-'+surface.name+'-'+theme+'-'+info.project.name+'.png');
   await page.screenshot({path:shot,animations:'disabled'});
   await info.attach(surface.name+'-'+theme,{path:shot,contentType:'image/png'});
   results.push({surface:surface.name,theme,status,overflow,unlabeled,screenshot:shot.split('/').pop(),project:info.project.name});
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  }
 }
 const output=info.outputPath('v1-public-journey-audit.json');
 fs.writeFileSync(output,JSON.stringify({scope:'anonymous read-only loopback browser; no login, payment, or live seller data',results},null,2));
 await info.attach('v1-public-journey-audit',{path:output,contentType:'application/json'});
 expect(results.filter(r=>r.status==='visited').length,'No public V1 surfaces could be visited').toBeGreaterThan(0);
});
