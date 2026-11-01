const {test,expect}=require('@playwright/test');
async function moderator(page,level='aal2'){
 await page.route('**/vendor/supabase-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>window.moderationFixture}'}));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>window.moderationFixture}'}));
 await page.addInitScript(level=>{
  window.moderationCalls=[];window.moderationListeners=[];
  window.moderationFixture={auth:{
   getUser:async()=>({data:{user:{id:'fixture-moderator'}},error:null}),
   mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level},error:null})},
   onAuthStateChange:callback=>{moderationListeners.push(callback);return {data:{subscription:{unsubscribe(){}}}}}
  },rpc:async (name,payload)=>{moderationCalls.push(name);if(payload)window.lastModerationPayload=payload;return {data:name==='is_deckplay_moderator'?true:name==='moderation_report_queue'?[{id:'synthetic-report',reason:'Counterfeit suspicion',details:'Private synthetic evidence',status:'open',listing_id:null}]:null,error:null}}};
  window.fireModerationAuth=(event,session)=>moderationListeners.forEach(callback=>callback(event,session));
 },level);
 await page.goto('/moderation.html');
}
test('moderator report data requires a verified MFA session',async({page})=>{
 await moderator(page,'aal1');
 await expect(page.locator('#state')).toContainText(/MFA|two.factor/i);
 await expect(page.locator('#reports')).toBeEmpty();
 expect(await page.evaluate(()=>moderationCalls)).not.toContain('moderation_report_queue');
});
test('sign-out immediately removes private moderation reports and action controls',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>fireModerationAuth('SIGNED_OUT',null));
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#state')).toContainText(/sign in/i);
});

test('a delayed moderation queue cannot restore reports after sign-out',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>name==='moderation_report_queue'?await new Promise(done=>window.finishModeratorQueue=done):{data:true,error:null};
  fireModerationAuth('TOKEN_REFRESHED',{user:{id:'fixture-moderator'}});
 });
 await expect.poll(()=>page.evaluate(()=>typeof finishModeratorQueue)).toBe('function');
 await page.evaluate(()=>{fireModerationAuth('SIGNED_OUT',null);finishModeratorQueue({data:[{id:'late-report',details:'Former account evidence'}],error:null})});
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#state')).toContainText(/sign in/i);
});

test('moderation actions recheck MFA before sending any write',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{moderationFixture.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1'},error:null})});
 await page.getByRole('textbox',{name:'Reason for review action (required)'}).fill('Synthetic evidence checked.');
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Resolve report',exact:true}).click();
 await expect(page.locator('#state')).toContainText('MFA required');
 await expect(page.locator('#reports')).toBeEmpty();
 expect(await page.evaluate(()=>moderationCalls)).not.toContain('review_deckplay_report');
 await expect(page.getByRole('button',{name:'Resolve report',exact:true})).toHaveCount(0);
});

test('report review requires a reason and sends the displayed status for concurrency protection',async({page})=>{
 await moderator(page);await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.getByRole('button',{name:'Resolve report',exact:true}).click();
 await expect(page.locator('#actionStatus')).toContainText('Enter a moderation reason');
 expect(await page.evaluate(()=>moderationCalls)).not.toContain('review_deckplay_report');
 await page.getByRole('textbox',{name:'Reason for review action (required)'}).fill('Reviewed synthetic counterfeit evidence.');
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Resolve report',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>lastModerationPayload)).toEqual({p_report_id:'synthetic-report',p_status:'resolved',p_reason:'Reviewed synthetic counterfeit evidence.',p_expected_status:'open'});
});


test('T8.2: staff can refresh capped private queue, recover from failure and scrub on tab hide',async({page})=>{
 await moderator(page);
 await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_queue')return {data:Array.from({length:100},(_,i)=>({id:'report-'+i,reason:'Synthetic review',details:'Fixture evidence '+i,status:'open'})),error:null};
   return {data:null,error:null};
  };
 });
 await page.locator('#refreshReports').click();
 await expect(page.locator('#state')).toContainText('100 reports returned');
 await expect(page.locator('#queueCoverage')).toContainText('More reports may exist');
 await expect(page.locator('#reports .card')).toHaveCount(100);
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>name==='is_deckplay_moderator'?{data:true,error:null}:{data:null,error:{message:'Synthetic network interruption'}};
 });
 await page.locator('#refreshReports').click();
 await expect(page.locator('#state')).toContainText('Private report queue unavailable. Refresh to retry.');
 await expect(page.locator('#state')).not.toContainText('Synthetic network interruption');
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#queueCoverage')).toBeEmpty();
 await expect(page.locator('#refreshReports')).toBeEnabled();
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>name==='is_deckplay_moderator'?{data:true,error:null}:{data:[{id:'recovered',reason:'Recovered report',details:'Private recovered fixture',status:'open'}],error:null};
 });
 await page.locator('#refreshReports').click();
 await expect(page.locator('#state')).toContainText('1 report returned');
 await expect(page.locator('#reports')).toContainText('Private recovered fixture');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#state')).toContainText('Private reports hidden');
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('#reports')).toContainText('Private recovered fixture');
});

test('T8.2: status filter never treats the bounded report snapshot as the full queue',async({page})=>{
 await moderator(page);
 await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_queue')return {data:Array.from({length:100},(_,i)=>({id:'bounded-'+i,reason:'Synthetic report',details:'Private bounded detail '+i,status:'open'})),error:null};
   return {data:null,error:null};
  };
 });
 await page.locator('#refreshReports').click();
 await expect(page.locator('#reports .card')).toHaveCount(100);
 await page.locator('[data-report-filter="reviewing"]').click();
 await expect(page.locator('#state')).toContainText('Showing 0 reviewing in the returned snapshot');
 await expect(page.locator('#reports')).toContainText('Other reports may exist beyond the first 100');
 await expect(page.locator('#reports')).not.toContainText('Private bounded detail');
 await expect(page.locator('#queueCoverage')).toContainText('More reports may exist');
 await expect(page.locator('[data-report-filter="reviewing"]')).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_queue')return {data:[
    {id:'open',reason:'New report',details:'Open private detail',status:'open'},
    {id:'review',reason:'Under review',details:'Review private detail',status:'reviewing'},
    {id:'resolved',reason:'Closed report',details:'Resolved private detail',status:'resolved'}
   ],error:null};
   return {data:null,error:null};
  };
 });
 await page.locator('#refreshReports').click();
 await expect(page.locator('#reports')).toContainText('Review private detail');
 await expect(page.locator('#reports')).not.toContainText('Open private detail');
 await expect(page.locator('#reports')).not.toContainText('Resolved private detail');
 await expect(page.locator('#state')).toContainText('Showing 1 reviewing in the returned snapshot');
 await page.locator('[data-report-filter="resolved"]').click();
 await expect(page.locator('#reports')).toContainText('Resolved private detail');
 await expect(page.locator('#reports')).not.toContainText('Review private detail');
 await page.evaluate(()=>fireModerationAuth('SIGNED_OUT',null));
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('[data-report-filter="resolved"]')).toBeDisabled();
 await expect(page.locator('[data-report-filter="all"]')).toHaveAttribute('aria-pressed','true');
});

test('T8.5: verified operator can prepare a safe incident handoff when report queue fails',async({page})=>{
 await moderator(page);
 await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  moderationFixture.rpc=async name=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_queue')return {data:null,error:{message:'Private fixture details must never escape'}};
   throw Error('No write RPC should be called');
  };
 });
 await page.locator('#refreshReports').click();
 await expect(page.locator('#state')).toContainText('Private report queue unavailable');
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#incidentPanel')).toBeVisible();
 await page.locator('#incidentKind').selectOption('Private moderation report queue');
 await page.locator('#incidentImpact').selectOption('Unavailable');
 await page.locator('#incidentPrepare').click();
 const draft=await page.locator('#incidentSummary').inputValue();
 expect(draft).toContain('OPERATOR INCIDENT HANDOFF (DRAFT; NOT SENT)');
 expect(draft).toContain('Moderation queue: Unavailable');
 expect(draft).toContain('LOCAL PREVIEW (synthetic)');
 expect(draft).toContain('No incident was filed');
 expect(draft).not.toContain('Private synthetic evidence');
 expect(draft).not.toContain('Private fixture details must never escape');
 expect(await page.evaluate(()=>moderationCalls)).not.toContain('review_deckplay_report');
 await expect(page.locator('#incidentCopy')).toBeEnabled();
 await page.evaluate(()=>fireModerationAuth('SIGNED_OUT',null));
 await expect(page.locator('#incidentPanel')).toBeHidden();
 await expect(page.locator('#incidentSummary')).toHaveValue('');
 await expect(page.locator('#incidentCopy')).toBeDisabled();
});

test('T8.4: stale report decisions refresh without retrying and denied writes scrub evidence',async({page})=>{
 await moderator(page);
 await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  window.reviewWriteCount=0;
  moderationFixture.rpc=async(name,payload)=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_queue')return {data:[{id:'synthetic-report',reason:'Counterfeit suspicion',details:'Fresh private evidence',status:'reviewing'}],error:null};
   if(name==='review_deckplay_report'){
    reviewWriteCount++;
    return {data:null,error:{code:'40001',message:'Sensitive SQL detail must not display'}};
   }
   throw Error('Unexpected RPC');
  };
 });
 await page.getByRole('textbox',{name:'Reason for review action (required)'}).fill('Reviewing conflicting synthetic evidence.');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Resolve report',exact:true}).click();
 await expect(page.locator('#reports')).toContainText('Fresh private evidence');
 await expect(page.locator('#reports')).toContainText('reviewing');
 await expect(page.locator('#actionStatus')).toContainText('Queue refreshed; review the current evidence');
 await expect(page.locator('#actionStatus')).not.toContainText('Sensitive SQL detail');
 expect(await page.evaluate(()=>reviewWriteCount)).toBe(1);
 await page.evaluate(()=>{
  moderationFixture.rpc=async(name)=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='review_deckplay_report')return {data:null,error:{code:'42501',message:'Sensitive authorization details'}};
   throw Error('Unexpected RPC');
  };
 });
 await page.getByRole('textbox',{name:'Reason for review action (required)'}).fill('Newly reviewed evidence requires escalation.');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Resolve report',exact:true}).click();
 await expect(page.locator('#state')).toContainText('Moderator access could not be verified');
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('#incidentPanel')).toBeHidden();
 await expect(page.locator('#state')).not.toContainText('Sensitive authorization details');
});

test('T8.4: private review history is MFA-scoped, readable and cleared on account exit',async({page})=>{
 await moderator(page);
 await expect(page.locator('#reports')).toContainText('Private synthetic evidence');
 await page.evaluate(()=>{
  window.historyPayload=null;
  moderationFixture.rpc=async(name,payload)=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_queue')return {data:[{id:'synthetic-report',reason:'Counterfeit suspicion',details:'Private synthetic evidence',status:'reviewing'}],error:null};
   if(name==='moderation_report_review_history'){
    historyPayload=payload;
    return {data:[{reviewed_at:'2026-11-01T21:00:00Z',previous_status:'open',next_status:'reviewing',review_reason:'Reviewed supplied evidence before decision.'}],error:null};
   }
   throw Error('Unexpected moderation RPC');
  };
 });
 await page.locator('.review-history summary').click();
 await expect(page.locator('.review-history')).toContainText('open → reviewing');
 await expect(page.locator('.review-history')).toContainText('Reviewed supplied evidence before decision.');
 expect(await page.evaluate(()=>historyPayload)).toEqual({p_report_id:'synthetic-report'});
 await page.locator('.review-history summary').click();
 await page.evaluate(()=>{
  moderationFixture.rpc=async(name)=>{
   moderationCalls.push(name);
   if(name==='is_deckplay_moderator')return {data:true,error:null};
   if(name==='moderation_report_review_history')return await new Promise(resolve=>window.finishHistory=resolve);
   throw Error('Unexpected moderation RPC');
  };
 });
 await page.locator('.review-history summary').click();
 await expect.poll(()=>page.evaluate(()=>typeof window.finishHistory)).toBe('function');
 await page.evaluate(()=>{
  fireModerationAuth('SIGNED_OUT',null);
  finishHistory({data:[{reviewed_at:'2026-11-01T21:00:00Z',previous_status:'open',next_status:'resolved',review_reason:'Former account secret must not render'}],error:null});
 });
 await expect(page.locator('#reports')).toBeEmpty();
 await expect(page.locator('body')).not.toContainText('Former account secret must not render');
 await expect(page.locator('#state')).toContainText('Sign in');
});
