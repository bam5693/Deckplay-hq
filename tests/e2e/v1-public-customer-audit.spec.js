// Read-only V1 customer-facing browser audit. No production URLs or credentials.
// Set DECKPLAY_QA_BASE_URL=http://127.0.0.1:8787 (or another loopback port).
const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.DECKPLAY_QA_BASE_URL;
const permitted=(()=>{try{const u=new URL(base);return ['localhost','127.0.0.1','[::1]'].includes(u.hostname)&&['http:','https:'].includes(u.protocol)}catch{return false}})();
test.skip(!permitted,'Read-only QA requires explicit loopback DECKPLAY_QA_BASE_URL; never audit production by default');
// These are customer actions, not guesses at label spelling. Account destinations live in a closed menu.
const surfaces=[
 {name:'marketplace',target:'#menuMarketplace',menu:true},
 {name:'favorites',target:'#myFavorites',menu:true},
 {name:'inbox',target:'#myMessages',menu:true},
 {name:'profile',target:'#myProfile',menu:true},
 {name:'sell',target:'button[data-sell]',menu:false},
];
test('first-time visitor explores V1 navigation with readable controls and screenshot evidence',async({page},info)=>{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const results=[];
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const surface of surfaces){
   const mobile=await page.locator('#mobileDock').isVisible();
   if(surface.menu&&!mobile){
    const account=page.locator('#accountButton');
    await expect(account,'Desktop account menu must be discoverable').toBeVisible();
    await account.click();
    await expect(page.locator('#accountMenu'),'Desktop account menu must open for guests').toBeVisible();
   }
   // Mobile has an intentional bottom dock; Favorites is a signed-in destination,
   // not a guest-visible navigation button. Record the gate without pretending we visited it.
   const mobileTargets={marketplace:'[data-dock="market"]',inbox:'[data-dock="inbox"]',profile:'[data-dock="profile"]',sell:'[data-dock="sell"]'};
   const guestGated=mobile&&surface.name==='favorites';
   const item=page.locator(mobile?(mobileTargets[surface.name]||'#__signed_in_favorites__'):surface.target).locator(':visible').first();
   const available=!guestGated&&await item.count()>0;
   let status=guestGated?'signed-in-only':'missing',overflow=[],unlabeled=[];
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
 const unvisited=results.filter(r=>!['visited','signed-in-only'].includes(r.status));
 expect(unvisited,'Every visible guest navigation destination should be reachable; missing is a failed audit, not a pass').toEqual([]);

});

test('guest seller sign-in has three separate readable actions with no overlapping Cancel',async({page},info)=>{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 const sell=page.locator('button:has-text("Sell")').filter({visible:true}).first();
 await sell.click();
 const dialog=page.locator('#authModal');
 await expect(dialog).toBeVisible();
 const buttons=dialog.locator('.dialog-actions button');
 await expect(buttons).toHaveCount(3);
 const rects=await buttons.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {text:el.textContent.trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,color:s.color,background:s.backgroundColor}}));
 const [signIn,forgot,cancel]=rects;
 for(const button of rects){
  expect(button.width,button.text+' should have tappable width').toBeGreaterThan(50);
  expect(button.height,button.text+' should be tall enough to tap').toBeGreaterThanOrEqual(40);
  expect(button.left,button.text+' should stay inside viewport').toBeGreaterThanOrEqual(-1);
  expect(button.right,button.text+' should stay inside viewport').toBeLessThanOrEqual(page.viewportSize().width+1);
 }
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 expect(overlap(signIn,forgot),'Sign in and Forgot password must not overlap').toBe(0);
 expect(overlap(forgot,cancel),'Cancel and Forgot password must not overlap').toBe(0);
 expect(overlap(signIn,cancel),'Cancel and Sign in must not overlap').toBe(0);
 const shot=info.outputPath('auth-actions-'+info.project.name+'.png');
 await page.screenshot({path:shot});
 await info.attach('guest-seller-sign-in-actions',{path:shot,contentType:'image/png'});
});
