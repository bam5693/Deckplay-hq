const {test,expect}=require('@playwright/test');
async function fixture(page,mode='off',blockState='clear'){
 await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/**',r=>r.fulfill({json:[]}));
 await page.goto('/');await page.waitForLoadState('networkidle');
 await page.evaluate(async ({mode,blockState})=>{
  await supabaseClient.auth.getSession();currentUser={id:'jayden'};syncInboxDraftUser();
  const profile={id:'tanner',username:'Tanner',collection_links:[{label:'Sports collection',url:'https://collectr.com/tanner'}],collection_inquiry_mode:mode};
  supabaseClient.from=table=>{const q={then:(a,b)=>Promise.resolve({data:[],error:null}).then(a,b)};for(const k of ['select','eq','order','limit'])q[k]=()=>q;q.maybeSingle=async()=>({data:table==='profiles'?profile:table==='user_blocks'&&blockState==='blocked'?{blocked_id:'tanner'}:null,error:table==='user_blocks'&&blockState==='error'?{message:'Block check unavailable'}:null});return q};
  window.inquiryWrites=[];supabaseClient.rpc=(name,args)=>new Promise(resolve=>{inquiryWrites.push({name,args});window.finishInquiry=resolve});
  await showPublicProfile('tanner');
 },{mode,blockState});
}
test('a collector without listings shares external links with inquiries off by default',async({page})=>{
 await fixture(page);
 await expect(page.locator('.public-collections a')).toHaveAttribute('href','https://collectr.com/tanner');
 await expect(page.locator('.public-collections a')).toHaveAttribute('rel',/noopener noreferrer/);
 await expect(page.locator('.public-collections')).toContainText('Items are not listed for sale');
 await expect(page.locator('[data-collection-inquiry]')).toHaveCount(0);
 await expect(page.locator('[data-message-profile]')).toHaveCount(0);
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

test('blocked collector profile does not reveal external collection links or storefront',async({page})=>{
 await fixture(page,'buy_trade','blocked');
 await expect(page.locator('#publicProfileContent')).toContainText('This collector is blocked');
 await expect(page.locator('.public-collections a')).toHaveCount(0);
 await expect(page.locator('[data-collection-inquiry],[data-follow-profile],[data-public-listing]')).toHaveCount(0);
});
test('failed block lookup never treats private collection links as unblocked',async({page})=>{
 await fixture(page,'buy_trade','error');
 await expect(page.locator('#publicProfileContent')).toContainText('Could not verify blocked collectors');
 await expect(page.locator('.public-collections a')).toHaveCount(0);
 await expect(page.locator('[data-collection-inquiry],[data-follow-profile],[data-public-listing]')).toHaveCount(0);
});

test('failed profile load cannot silently replace saved collection links or inquiry consent',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  const original=supabaseClient.from;window.collectionProfileWrites=[];
  supabaseClient.from=table=>{
   const q=original(table);
   if(table==='profiles'){
    q.maybeSingle=async()=>({data:null,error:{message:'Network unavailable'}});
    q.upsert=async payload=>{collectionProfileWrites.push(payload);return {error:null}};
   }
   return q;
  };
  document.getElementById('profileEdit').click();
 });
 await expect(page.locator('#profileStatus')).toContainText('Could not load your saved collection settings');
 await expect(page.locator('#profileForm button[type="submit"]')).toBeDisabled();
 await page.locator('#profileForm').dispatchEvent('submit');
 expect(await page.evaluate(()=>collectionProfileWrites.length)).toBe(0);
});

test('collection inquiry opt-in requires a shared public link',async({page})=>{
 await fixture(page);
 await page.evaluate(()=>{
  const original=supabaseClient.from;window.collectionProfileWrites=[];
  supabaseClient.from=table=>{
   const q=original(table);
   if(table==='profiles'){
    q.maybeSingle=async()=>({data:{username:'jayden',collection_links:[],collection_inquiry_mode:'off'},error:null});
    q.upsert=async payload=>{collectionProfileWrites.push(payload);return {error:null}};
   }
   return q;
  };
  document.getElementById('profileEdit').click();
 });
 await expect(page.locator('#profileForm button[type="submit"]')).toBeEnabled();
 await page.locator('#collectionInquiryMode').selectOption('buy_trade');
 await page.locator('#profileForm').dispatchEvent('submit');
 await expect(page.locator('#profileStatus')).toContainText('Add a public collection link');
 expect(await page.evaluate(()=>collectionProfileWrites.length)).toBe(0);
});

test('duplicate first contact opens the existing conversation without another inquiry',async({page})=>{
 await fixture(page,'buy_trade');await page.locator('[data-collection-inquiry]').click();
 await expect(page.locator('#collectionInquiryModal')).toContainText('does not set a price, reserve an item, or create an agreement');
 await page.locator('#collectionInquiryItem').fill('Nintendo Switch OLED console');
 await page.locator('#collectionInquiryBody').fill('Would you consider trading this console?');
 await page.evaluate(()=>{window.inboxOpens=[];showInboxPage=async target=>{inboxOpens.push(target??null)}});
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 await page.evaluate(()=>finishInquiry({error:{message:'You already inquired about this item. Continue in your inbox'}}));
 await expect(page.locator('#collectionInquiryContinue')).toBeVisible();
 await expect(page.locator('#collectionInquiryContinue')).toHaveText('Continue existing conversation');
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('Would you consider trading this console?');
 await page.locator('#collectionInquiryContinue').click();
 expect(await page.evaluate(()=>({writes:inquiryWrites.length,targets:inboxOpens}))).toEqual({writes:1,targets:['tanner']});
});
test('daily first-contact limit directs to inbox overview, not an unverified recipient thread',async({page})=>{
 await fixture(page,'trades');await page.locator('[data-collection-inquiry]').click();
 await page.locator('#collectionInquiryItem').fill('Signed sports memorabilia');
 await page.locator('#collectionInquiryBody').fill('Is this available for trade?');
 await page.evaluate(()=>{window.inboxOpens=[];showInboxPage=async target=>{inboxOpens.push(target??null)}});
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 await page.evaluate(()=>finishInquiry({error:{message:'Collection inquiry limit reached. Continue existing conversations or try tomorrow'}}));
 await expect(page.locator('#collectionInquiryContinue')).toHaveText('Open inbox');
 await page.locator('#collectionInquiryContinue').click();
 expect(await page.evaluate(()=>({writes:inquiryWrites.length,targets:inboxOpens}))).toEqual({writes:1,targets:[null]});
});
test('blocked first contact cannot use the inbox recovery shortcut',async({page})=>{
 await fixture(page,'buy_trade');await page.locator('[data-collection-inquiry]').click();
 await page.locator('#collectionInquiryItem').fill('One Piece alternate art card');
 await page.locator('#collectionInquiryBody').fill('Could we discuss a trade?');
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 await page.evaluate(()=>finishInquiry({error:{message:'Collection inquiry unavailable'}}));
 await expect(page.locator('#collectionInquiryStatus')).toContainText('not accepting new collection inquiries');
 await expect(page.locator('#collectionInquiryContinue')).toBeHidden();
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('Could we discuss a trade?');
});

test('old inquiry completion cannot close or clear a newly opened collection inquiry',async({page})=>{
 await fixture(page,'buy_trade');
 await page.locator('[data-collection-inquiry]').click();
 await page.locator('#collectionInquiryItem').fill('First console');
 await page.locator('#collectionInquiryBody').fill('First draft to send');
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 await page.evaluate(()=>{window.oldInquiryResolve=finishInquiry;window.inboxOpens=[];showInboxPage=async target=>inboxOpens.push(target)});
 await page.evaluate(async()=>{await showPublicProfile('tanner');document.querySelector('[data-collection-inquiry]').click()});
 await expect(page.locator('#collectionInquiryForm button[type="submit"]')).toBeEnabled();
 await page.locator('#collectionInquiryItem').fill('New console');
 await page.locator('#collectionInquiryBody').fill('New draft stays intact');
 await page.evaluate(()=>oldInquiryResolve({data:'old-message-id',error:null}));
 await expect(page.locator('#collectionInquiryModal')).toHaveClass(/open/);
 await expect(page.locator('#collectionInquiryItem')).toHaveValue('New console');
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('New draft stays intact');
 await expect(page.locator('#collectionInquiryForm button[type="submit"]')).toBeEnabled();
 expect(await page.evaluate(()=>inboxOpens)).toEqual([]);
});

test('trades-only inquiry stays trades-only after a failed send',async({page})=>{
 await fixture(page,'trades');
 await page.locator('[data-collection-inquiry]').click();
 await page.locator('#collectionInquiryItem').fill('Vintage controller');
 await page.locator('#collectionInquiryBody').fill('Would you consider a trade?');
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 await page.evaluate(()=>finishInquiry({error:{message:'Network unavailable'}}));
 await expect(page.locator('#collectionInquiryStatus')).toContainText('draft is preserved');
 await expect(page.locator('#collectionInquiryIntent option[value="buy"]')).toBeDisabled();
 await expect(page.locator('#collectionInquiryIntent')).toHaveValue('trade');
 await expect(page.locator('#collectionInquiryForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('Would you consider a trade?');
});

test('dismissing a pending collection inquiry never opens Inbox after a late response',async({page})=>{
 await fixture(page,'buy_trade');
 await page.locator('[data-collection-inquiry]').click();
 await page.locator('#collectionInquiryItem').fill('Sealed retro game');
 await page.locator('#collectionInquiryBody').fill('Would you trade this game?');
 await page.evaluate(()=>{window.inboxOpens=[];showInboxPage=async target=>inboxOpens.push(target);});
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 await page.evaluate(()=>{window.dismissedInquiryResolve=finishInquiry});
 await page.locator('#collectionInquiryModal [data-close="collectionInquiryModal"]').click();
 await page.evaluate(()=>dismissedInquiryResolve({error:null}));
 await expect(page.locator('#collectionInquiryModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>inboxOpens)).toEqual([]);
 await page.evaluate(()=>showPublicProfile('tanner'));
 await page.locator('[data-collection-inquiry]').click();
 await expect(page.locator('#collectionInquiryForm button[type="submit"]')).toBeEnabled();
 await page.locator('#collectionInquiryItem').fill('Different game');
 await page.locator('#collectionInquiryBody').fill('New inquiry draft');
 await page.locator('#collectionInquiryForm button[type="submit"]').click();
 expect(await page.evaluate(()=>inquiryWrites.length)).toBe(2);
 await page.evaluate(()=>finishInquiry({error:{message:'Network unavailable'}}));
 await expect(page.locator('#collectionInquiryBody')).toHaveValue('New inquiry draft');
 await expect(page.locator('#collectionInquiryStatus')).toContainText('draft is preserved');
});
