const {test,expect}=require('@playwright/test');

// Synthetic, local-only seller/buyer lifecycle: no staging writes.
test('seller can pause and resume every category without relisting reserved or sold items',async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 const accepted=[];
 page.on('dialog',async d=>{accepted.push(d.message());await d.accept()});
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'pause-owner',user_metadata:{username:'Seller'}};syncInboxDraftUser();
  window.pauseWrites=[];window.pausedRows=['trading_cards','video_games','consoles','controllers','accessories','collectibles','other'].map((category,i)=>({
   id:'pause-'+i,seller_id:'pause-owner',title:'Synthetic '+category,price:20+i,category,status:i===4?'reserved':i===5?'sold':'active',image_urls:[],created_at:'2026-10-01T00:00:00Z'
  }));
  supabaseClient.from=table=>{
   let update=null,filters=[];
   const q={
    select:()=>q,
    order:()=>q,
    limit:()=>q,
    in:()=>q,
    eq:(name,value)=>{filters.push([name,value]);return q},
    update:value=>{update=value;return q},
    maybeSingle:async()=>{
      const row=pausedRows.find(r=>r.id===filters.find(([k])=>k==='id')?.[1]);
      if(!row||row.seller_id!==filters.find(([k])=>k==='seller_id')?.[1]||
         row.status!==filters.find(([k])=>k==='status')?.[1])
       return {data:null,error:null};
      pauseWrites.push({id:row.id,from:row.status,to:update.status});
      row.status=update.status;return {data:{id:row.id},error:null};
    },
    then:(resolve,reject)=>Promise.resolve({data:table==='profiles'?{username:'Seller'}:
     table==='listings'?pausedRows.filter(row=>filters.every(([name,value])=>name==='status'?row.status===value:name==='seller_id'?row.seller_id===value:true)):[],error:null}).then(resolve,reject)
   };
   return q;
  };
  await showCollectorPage('listings');
 });
 await expect(page.locator('[data-page-pause]')).toHaveCount(5);
 await expect(page.locator('[data-page-resume]')).toHaveCount(0);
 await expect(page.locator('[data-page-pause="pause-4"]')).toHaveCount(0);
 await expect(page.locator('[data-page-pause="pause-5"]')).toHaveCount(0);
 await page.locator('[data-page-pause="pause-1"]').click();
 await expect(page.locator('[data-page-resume="pause-1"]')).toHaveCount(1);
 await expect(page.locator('[data-inventory-status="paused"]')).toHaveCount(1);
 await page.locator('#inventoryStatus').selectOption('paused');
 await expect(page.locator('[data-inventory-search]:visible')).toHaveCount(1);
 await expect.poll(()=>page.evaluate(()=>pausedRows.find(x=>x.id==='pause-1').status)).toBe('paused');
 await page.locator('[data-page-resume="pause-1"]').click();
 await expect(page.locator('[data-page-pause="pause-1"]')).toHaveCount(1);
 expect(await page.evaluate(()=>pauseWrites)).toEqual([
  {id:'pause-1',from:'active',to:'paused'},
  {id:'pause-1',from:'paused',to:'active'}
 ]);
 expect(accepted).toHaveLength(2);
 await expect(page.locator('[data-inventory-status="reserved"]')).toHaveCount(1);
 await expect(page.locator('[data-inventory-status="sold"]')).toHaveCount(1);
});

test('a stale seller pause cannot overwrite reserved inventory or another owner',async({page})=>{
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 page.on('dialog',d=>d.accept());
 await page.evaluate(async()=>{
  await supabaseClient.auth.getSession();currentUser={id:'owner1'};syncInboxDraftUser();
  window.writes=[];let row={id:'one',title:'A card',price:25,status:'active',category:'trading_cards',image_urls:[]};
  supabaseClient.from=table=>{
   let action,where=[];
   const q={select:()=>q,order:()=>q,eq:(n,v)=>{where.push([n,v]);return q},update:data=>{action=data;return q},
    maybeSingle:async()=>{writes.push({action,where});return {data:null,error:null}},
    then:(resolve,reject)=>Promise.resolve({data:table==='profiles'?{}:table==='listings'?[row]:[],error:null}).then(resolve,reject)};
   return q;
  };
  await showCollectorPage('listings');
 });
 await page.locator('[data-page-pause="one"]').click();
 await expect(page.locator('#toast')).toContainText('Listing status changed or inventory was reserved');
 const writes=await page.evaluate(()=>writes);
 expect(writes).toHaveLength(1);
 expect(writes[0].where).toContainEqual(['seller_id','owner1']);
 expect(writes[0].where).toContainEqual(['status','active']);
});
