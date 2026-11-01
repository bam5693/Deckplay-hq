const {test,expect}=require('@playwright/test');

// Focused local fixtures only: no staging DB writes, no real customer posts.
test.beforeEach(async({page})=>{
 await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
 await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',route=>route.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{
  currentUser={id:'wanted-owner-a'};syncInboxDraftUser();
  window.wantedDeleteCalls=0;window.wantedReadCalls=0;
  window.wantedDeleteToasts=[];window.wantedPostOwner='wanted-owner-a';
  toast=message=>wantedDeleteToasts.push(message);
  window.confirm=()=>true;
  const originalFrom=supabaseClient.from.bind(supabaseClient);
  supabaseClient.from=table=>{
   if(table==='wanted_posts')return {
    select:()=>({order:()=>({limit:()=>{
     wantedReadCalls++;
     return Promise.resolve({data:[{
      id:'owned-wanted',user_id:wantedPostOwner,game:'one_piece',
      title:'OP-05 Manga Luffy',offer_type:'buy',budget:300,
      details:'Looking for a clean copy'
     }],error:null});
    }})}),
    delete:()=>{
     const request={
      eq:()=>request,
      then:(success,failure)=>new Promise(resolve=>{
       wantedDeleteCalls++;window.finishWantedDelete=resolve;
      }).then(success,failure)
     };
     return request;
    }
   };
   if(table==='profiles')return {select:()=>({in:()=>Promise.resolve({data:[],error:null})})};
   return originalFrom(table);
  };
  toggleWanted(true);
 });
 await expect(page.locator('[data-delete-wanted]')).toBeVisible();
});

test('Tanner: double delete is one write, failed network retains the post and allows retry',async({page})=>{
 const button=page.locator('[data-delete-wanted]');
 await button.click();
 await expect(button).toBeDisabled();
 await expect(button).toHaveText('Deleting…');
 await button.evaluate(el=>el.click());
 expect(await page.evaluate(()=>wantedDeleteCalls)).toBe(1);
 await page.evaluate(()=>finishWantedDelete({error:{message:'Offline'}}));
 await expect(button).toBeEnabled();
 await expect(button).toHaveText('Delete');
 expect(await page.evaluate(()=>wantedDeleteToasts)).toEqual(['Offline']);
 await button.click();
 expect(await page.evaluate(()=>wantedDeleteCalls)).toBe(2);
 await page.evaluate(()=>finishWantedDelete({error:null}));
 await expect.poll(()=>page.evaluate(()=>wantedReadCalls)).toBe(2);
});

test('Jayden: old-account deletion response cannot refresh or toast on a different account',async({page})=>{
 await page.locator('[data-delete-wanted]').click();
 expect(await page.evaluate(()=>wantedDeleteCalls)).toBe(1);
 await page.evaluate(async()=>{
  currentUser={id:'wanted-owner-b'};listingAccountVersion++;syncInboxDraftUser();
  wantedPostOwner='wanted-owner-b';
  await loadWanted();
  finishWantedDelete({error:null});
 });
 await expect(page.locator('[data-delete-wanted]')).toBeVisible();
 expect(await page.evaluate(()=>wantedReadCalls)).toBe(2);
 expect(await page.evaluate(()=>wantedDeleteToasts)).toEqual([]);
});
