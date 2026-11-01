const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.route('https://challenges.cloudflare.com/**',r=>r.abort());await page.route('https://prrrzeelltmyugssqnzk.supabase.co/rest/v1/**',r=>r.fulfill({json:[]}));await page.goto('/');await page.waitForLoadState('networkidle')});
const settle=page=>page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
async function editor(page){await page.evaluate(()=>{
 currentUser={id:'fixture-owner'};syncInboxDraftUser();window.pendingEditors=[];
 supabaseClient.from=table=>{const q={then:(resolve,reject)=>(table==='profiles'?new Promise(done=>pendingEditors.push(done)):Promise.resolve({data:[],count:0,error:null})).then(resolve,reject)};for(const key of ['select','eq','maybeSingle','order','in','limit'])q[key]=()=>q;return q};
})}
test('profile editor ignores results from a previous account',async({page})=>{
 await editor(page);await page.evaluate(()=>document.getElementById('profileEdit').click());await expect.poll(()=>page.evaluate(()=>pendingEditors.length)).toBe(1);
 await page.evaluate(()=>{currentUser={id:'fixture-new'};syncInboxDraftUser();pendingEditors[0]({data:{username:'previous_owner',bio:'Private prior draft'},error:null})});await settle(page);
 await expect(page.locator('#profileModal')).not.toHaveClass(/open/);await expect(page.locator('#profileUsername')).not.toHaveValue('previous_owner');
});
test('profile editor uses the newest request when replies arrive out of order',async({page})=>{
 await editor(page);await page.evaluate(()=>{document.getElementById('profileEdit').click();document.getElementById('profileEdit').click()});await expect.poll(()=>page.evaluate(()=>pendingEditors.length)).toBe(2);
 await page.evaluate(()=>pendingEditors[1]({data:{username:'newest_name'},error:null}));await settle(page);await expect(page.locator('#profileUsername')).toHaveValue('newest_name');
 await page.evaluate(()=>pendingEditors[0]({data:{username:'outdated_name'},error:null}));await settle(page);await expect(page.locator('#profileUsername')).toHaveValue('newest_name');
});
async function saving(page){await page.evaluate(()=>{
 currentUser={id:'fixture-owner',user_metadata:{}};syncInboxDraftUser();window.profileWrites=[];window.metadataWrites=0;
 supabaseClient.from=()=>{const q={then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)};for(const key of ['select','eq','maybeSingle','in','order','limit'])q[key]=()=>q;q.upsert=payload=>{profileWrites.push(payload);return q};return q};
 supabaseClient.auth.updateUser=async()=>{metadataWrites++;return {error:null}};supabaseClient.auth.getUser=async()=>({data:{user:currentUser},error:null});
 openModal('profileModal');document.getElementById('profileUsername').value='fixture_owner';document.getElementById('profileBio').value='My profile edit';
})}
test('account switching during avatar upload cannot update the new account profile',async({page})=>{
 await saving(page);await page.evaluate(()=>{supabaseClient.storage.from=()=>({upload:async()=>await new Promise(done=>window.finishAvatarUpload=done),getPublicUrl:()=>({data:{publicUrl:'https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/profile-avatars/fixture-owner/test.png'}})})});
 await page.locator('#profileAvatarFile').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 await page.locator('#profileForm button[type="submit"]').click();await expect.poll(()=>page.evaluate(()=>typeof finishAvatarUpload)).toBe('function');
 await page.evaluate(()=>{currentUser={id:'fixture-new',user_metadata:{}};syncInboxDraftUser();finishAvatarUpload({error:null})});await settle(page);
 expect(await page.evaluate(()=>profileWrites)).toEqual([]);expect(await page.evaluate(()=>metadataWrites)).toBe(0);
});
test('profile save prevents duplicate submissions and releases controls on exceptions',async({page})=>{
 await saving(page);await page.evaluate(()=>{supabaseClient.from=()=>({upsert:async payload=>{profileWrites.push(payload);return await new Promise(done=>window.finishProfileSave=done)}})});
 await page.evaluate(()=>{const form=document.getElementById('profileForm');form.requestSubmit();form.requestSubmit()});expect(await page.evaluate(()=>profileWrites.length)).toBe(1);
 await page.evaluate(()=>finishProfileSave(Promise.reject(Error('Profile connection failed'))));await expect(page.locator('#profileStatus')).toContainText('Profile connection failed');await expect(page.locator('#profileForm button[type="submit"]')).toBeEnabled();await expect(page.locator('#profileUsername')).toHaveValue('fixture_owner');
});

test('profile save timeout preserves the form and does not invent success when verification fails',async({page})=>{
 await page.clock.install();await saving(page);
 await page.evaluate(()=>{
  supabaseClient.from=()=>({
   upsert:payload=>{profileWrites.push(payload);return new Promise(()=>{})},
   select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})
  });
  document.getElementById('profileForm').requestSubmit();
 });
 await expect.poll(()=>page.evaluate(()=>profileWrites.length)).toBe(1);
 await page.clock.fastForward(10100);
 await expect(page.locator('#profileStatus')).toContainText('could not confirm whether your changes saved');
 await expect(page.locator('#profileForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#profileBio')).toHaveValue('My profile edit');
 await expect(page.locator('#profileModal')).toHaveClass(/open/);
});

test('profile save timeout verifies the owner row before showing saved',async({page})=>{
 await page.clock.install();await saving(page);
 await page.evaluate(()=>{
  supabaseClient.from=()=>({
   upsert:payload=>{profileWrites.push(payload);return new Promise(()=>{})},
   select:()=>({eq:()=>({maybeSingle:async()=>({data:profileWrites.at(-1),error:null})})})
  });
  document.getElementById('profileForm').requestSubmit();
 });
 await expect.poll(()=>page.evaluate(()=>profileWrites.length)).toBe(1);
 await page.clock.fastForward(10100);
 await expect(page.locator('#profileModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>profileWrites.length)).toBe(1);
});

test('late profile save from a signed-out account cannot alter the next account editor',async({page})=>{
 await saving(page);
 await page.evaluate(()=>{
  supabaseClient.from=()=>({upsert:payload=>{profileWrites.push(payload);return new Promise(done=>window.finishOldProfileSave=done)}});
  document.getElementById('profileForm').requestSubmit();
 });
 await expect.poll(()=>page.evaluate(()=>profileWrites.length)).toBe(1);
 await page.evaluate(()=>{
  currentUser={id:'fixture-new',user_metadata:{}};
  syncInboxDraftUser();
  finishOldProfileSave({error:null});
 });
 await settle(page);
 await expect(page.locator('#profileForm button[type="submit"]')).toBeEnabled();
 await expect(page.locator('#profileModal')).not.toHaveClass(/open/);
 expect(await page.evaluate(()=>metadataWrites)).toBe(0);
});

test('posting a listing cannot overwrite an existing collector username or display name',async({page})=>{
 await page.evaluate(async()=>{
  window.profileEnsureWrites=[];
  supabaseClient.from=table=>{
   if(table!=='profiles')throw Error('Unexpected profile test table');
   return {upsert:async(payload,options)=>{
    profileEnsureWrites.push({payload,options});
    return {error:null};
   }};
  };
  await ensureProfile({id:'fixture-owner',email:'owner@example.test',user_metadata:{}});
 });
 const writes=await page.evaluate(()=>profileEnsureWrites);
 expect(writes).toHaveLength(1);
 expect(writes[0].payload.id).toBe('fixture-owner');
 expect(writes[0].options).toEqual({onConflict:'id',ignoreDuplicates:true});
});

test('collectors can save interests across every marketplace category and card game',async({page})=>{
 await saving(page);
 const catalog=await page.locator('#tcgGame option').evaluateAll(nodes=>nodes.filter(x=>x.value).map(x=>x.textContent));
 const interests=await page.locator('#profileGame option').evaluateAll(nodes=>nodes.map(x=>x.value));
 expect(interests).toEqual(expect.arrayContaining(catalog));
 for(const interest of ['Sports cards','Video games','Consoles & hardware','Controllers & accessories','Collectibles','Other']){
  await page.locator('#profileGame').selectOption(interest);
  await page.locator('#profileForm').evaluate(form=>form.requestSubmit());
  await expect.poll(()=>page.evaluate(()=>profileWrites.at(-1)?.favorite_tcg)).toBe(interest);
  await expect(page.locator('#profileForm button[type="submit"]')).toBeEnabled();
  await page.evaluate(()=>openModal('profileModal'));
 }
});
test('editing preserves a saved collection interest outside current options and clears it on account switch',async({page})=>{
 await editor(page);await page.evaluate(()=>document.getElementById('profileEdit').click());
 await expect.poll(()=>page.evaluate(()=>pendingEditors.length)).toBe(1);
 await page.evaluate(()=>pendingEditors[0]({data:{username:'collector_name',favorite_tcg:'Vintage model trains'},error:null}));
 await expect(page.locator('#profileModal')).toHaveClass(/open/);
 await expect(page.locator('#profileGame')).toHaveValue('Vintage model trains');
 await page.evaluate(()=>{currentUser={id:'another-collector'};syncInboxDraftUser()});
 await expect(page.locator('#profileGame [data-saved-interest]')).toHaveCount(0);
 await expect(page.locator('#profileGame')).toHaveValue('');
});
