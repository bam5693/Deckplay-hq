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
