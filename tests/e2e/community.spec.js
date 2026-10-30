const {test,expect}=require('@playwright/test');
const {signIn,menu,cleanup,marker}=require('../helpers/staging.cjs');
test('profile edit, wanted post, settings and notification preferences persist',async({page})=>{
 test.setTimeout(180000);const stage=async(name,fn)=>test.step(name,fn);await stage('Sign in seller',()=>signIn(page,'SELLER'));const title=marker();let original;
 try{
  original=await page.evaluate(async()=>{const {data,error}=await supabaseClient.from('profiles').select('*').eq('id',currentUser.id).single();if(error)throw Error(error.message);return data});
  await menu(page,'profileEdit');await expect(page.locator('#profileModal')).toHaveClass(/open/);
  await page.locator('#profileBio').fill(title);await page.locator('#profileLocation').fill('Automated staging');await page.locator('#profileGame').selectOption('One Piece');
  await page.locator('#profileForm button[type="submit"]').click();await expect(page.locator('#profileModal')).not.toHaveClass(/open/,{timeout:20000});
  await menu(page,'myProfile');await expect(page.locator('#pageBio')).toContainText(title,{timeout:20000});
  await menu(page,'menuPostWanted');await page.locator('#wantedItem').fill(title);await page.locator('#wantedGame').selectOption('one_piece');await page.locator('#wantedBudget').fill('50');await page.locator('#wantedDetails').fill(title);await page.locator('#wantedForm button[type="submit"]').click();await expect(page.locator('#wantedModal')).not.toHaveClass(/open/,{timeout:20000});
  await stage('Verify wanted post appears in profile',async()=>{await menu(page,'myProfile');await page.locator('[data-profile-tab="wanted"]').click();await expect.poll(async()=>page.locator('#profilePageContent').innerText(),{timeout:30000}).toContain(title)});
  await stage('Open notification settings',async()=>{await menu(page,'profileSettings');await expect(page.locator('#notificationSettingsStatus')).toContainText('Preferences saved',{timeout:20000})});
  await page.locator('[data-theme-choice="dark"]').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('button[data-font-size="large"]').click();await expect(page.locator('html')).toHaveAttribute('data-font-size','large');
  const pref=page.locator('[data-notify-pref="product_updates"]');const prior=await pref.isChecked();await pref.setChecked(!prior);await expect(page.locator('#notificationSettingsStatus')).toContainText('Preferences saved',{timeout:15000});
  await page.locator('[data-close="settingsModal"]').click({position:{x:8,y:8},timeout:10000});await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveAttribute('data-font-size','large');
  await menu(page,'profileSettings');await expect(page.locator('#notificationSettingsStatus')).toContainText('Preferences saved',{timeout:15000});await expect(pref).toBeChecked({checked:!prior});await pref.setChecked(prior);await expect(page.locator('#notificationSettingsStatus')).toContainText('Preferences saved');
  await page.locator('button[data-font-size="normal"]').click();await page.locator('[data-theme-choice="auto"]').click();await page.locator('[data-close="settingsModal"]').click({position:{x:8,y:8},timeout:10000});
 }finally{
  if(original&&!page.isClosed())await page.evaluate(async original=>{const {error}=await supabaseClient.from('profiles').update({bio:original.bio,favorite_tcg:original.favorite_tcg,location_label:original.location_label}).eq('id',currentUser.id);if(error)throw Error(error.message)},original);
  if(!page.isClosed())await cleanup(page,title);
 }
});
