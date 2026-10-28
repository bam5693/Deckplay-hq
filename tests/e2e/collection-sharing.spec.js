const {test,expect}=require('@playwright/test');
async function fixture(page,mode='off'){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async mode=>{
  await supabaseClient.auth.getSession();currentUser={id:'jayden'};syncInboxDraftUser();
  const profile={id:'tanner',username:'Tanner',collection_links:[{label:'Sports collection',url:'https://collectr.com/tanner'}],collection_inquiry_mode:mode};
  supabaseClient.from=table=>{const q={then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)};for(const k of ['select','eq','order','limit'])q[k]=()=>q;q.maybeSingle=async()=>({data:table==='profiles'?profile:null,error:null});return q};
  window.inquiryWrites=[];supabaseClient.rpc=(name,args)=>new Promise(resolve=>{inquiryWrites.push({name,args});window.finishInquiry=resolve});
  await showPublicProfile('tanner');
 },mode);
}
test('a collector without listings shares external links with inquiries off by default',async({page})=>{
 await fixture(page);
 await expect(page.locator('.public-collections a')).toHaveAttribute('href','https://collectr.com/tanner');
 await expect(page.locator('.public-collections a')).toHaveAttribute('rel',/noopener noreferrer/);
 await expect(page.locator('.public-collections')).toContainText('Items are not listed for sale');
 await expect(page.locator('[data-collection-inquiry]')).toHaveCount(0);
 const results=await page.evaluate(()=>['javascript:alert(1)','http://collectr.com/a','https://user@collectr.com/','https://127.0.0.1/','https://collectr.com/?token=secret'].map(safeCollectionUrl));
 expect(results).toEqual(['','','','','']);
});
test('trade-only inquiry preserves drafts after failure and prevents repeated taps',async({page})=>{
 await fixture(page,'trades');await page.locator('[data-collection-inquiry]').click();
 await expect(page.locator('#collectionInquiryIntent option[value="buy"]')).toBeDisabled();
 await page.locator('#collectionInquiryItem').fill('PSA 9 sports card #42');await page.locator('#collectionInquiryBody').fill('Would you trade for One Piece?');
 await page.locator('#collectionInquiryForm button').click();await page.locator('#collectionInquiryForm').dispatchEvent('submit');
 expect(await page.evaluate(()=>inquiryWrites.length)).toBe(1);
 await page.evaluate(()=>finishInquiry({error:{message:'Collector paused inquiries'}}));
 await expect(page.locator('#collectionInquiryStatus')).toContainText('Collector paused');
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('Would you trade for One Piece?');
 await expect(page.locator('#collectionInquiryForm button')).toBeEnabled();
});
test('account switch clears the private collection inquiry draft',async({page})=>{
 await fixture(page,'buy_trade');await page.locator('[data-collection-inquiry]').click();await page.locator('#collectionInquiryBody').fill('Private draft');
 await page.evaluate(()=>{currentUser={id:'another'};syncInboxDraftUser()});
 await expect(page.locator('#collectionInquiryModal')).not.toHaveClass(/open/);
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('');
});
