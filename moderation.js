/* UI privacy safeguards supplement server authorization; never grant roles here. */
(() => {
 const state=document.getElementById('state'),out=document.getElementById('reports'),status=document.getElementById('actionStatus');
 const refresh=document.getElementById('refreshReports'),coverage=document.getElementById('queueCoverage');
 const filters=[...document.querySelectorAll('[data-report-filter]')];
 const incident=document.getElementById('incidentPanel'),incidentKind=document.getElementById('incidentKind');
 const incidentImpact=document.getElementById('incidentImpact'),incidentPrepare=document.getElementById('incidentPrepare');
 const incidentCopy=document.getElementById('incidentCopy'),incidentSummary=document.getElementById('incidentSummary');
 const incidentStatus=document.getElementById('incidentStatus');
 const client=window.supabase.createClient('https://yffruutknztvdyioovmp.supabase.co','sb_publishable_cHzM8sQmrqfcCH8lhESytg_FMJrQtCX');
 let generation=0,authorizedUser=null,busy=false,reportsSnapshot=[],reportFilter='all';
 let queueState='not checked',queueCheckedAt=null;
 function selectFilter(value){reportFilter=value;filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reportFilter===value)))}
 function clearPrivate(){
  authorizedUser=null;busy=false;reportsSnapshot=[];queueState='not checked';queueCheckedAt=null;
  out.replaceChildren();status.textContent='';coverage.textContent='';refresh.disabled=false;
  filters.forEach(button=>button.disabled=true);
  incident.hidden=true;incidentSummary.value='';incidentStatus.textContent='';incidentCopy.disabled=true;
  incidentKind.selectedIndex=0;incidentImpact.selectedIndex=0;
 }
 function controls(disabled){out.querySelectorAll('button,textarea').forEach(control=>control.disabled=disabled);refresh.disabled=disabled;filters.forEach(button=>button.disabled=disabled)}
 function deny(message){const error=Error(message);error.accessDenied=true;throw error}
 async function verifyAccess(active){
  const {data,error}=await client.auth.getUser();
  if(!active())return null;
  if(error||!data?.user)deny('Sign in to DeckPlay first, then return to this page.');
  const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(!active())return null;
  if(assurance.error||assurance.data?.currentLevel!=='aal2')deny('MFA required. Use the authenticator setup link to set up or verify two-factor authentication before using moderator tools.');
  const role=await client.rpc('is_deckplay_moderator');
  if(!active())return null;
  if(role.error||role.data!==true)deny('Access restricted to DeckPlay moderators. Moderator services must be configured before this queue can be used.');
  return data.user.id;
 }
 async function load(){
  const version=++generation,active=()=>version===generation;
  clearPrivate();refresh.disabled=true;state.textContent='Checking your moderator access…';
  try{
   const userId=await verifyAccess(active);if(!userId||!active())return;
   // Verified staff may prepare a safe incident handoff even if the queue RPC fails.
   // The panel contains no report data and is hidden on any role/MFA failure.
   authorizedUser=userId;incident.hidden=false;queueState='loading';queueCheckedAt=null;
   state.textContent='Loading private report queue…';
   const {data,error}=await client.rpc('moderation_report_queue');
   if(!active())return;if(error)throw error;
   if(!Array.isArray(data))throw Error('Moderator queue is unavailable.');
   reportsSnapshot=data;queueState=data.length>=100?'bounded snapshot':'snapshot loaded';queueCheckedAt=new Date().toISOString();
   filters.forEach(button=>button.disabled=false);
   state.textContent=data.length?data.length+(data.length===1?' report':' reports')+' returned by the private queue. Reports are allegations, not proof of wrongdoing.':'No reports returned by the private queue.';
   // The server RPC returns at most 100 reports, sorted open first. Never
   // present that bounded snapshot as a complete database-wide total.
   coverage.textContent=data.length>=100
    ?'Showing the first 100 reports, prioritized by open, then reviewing, then resolved. More reports may exist. Refresh to check for changes.'
    :'Queue snapshot loaded. Refresh to check for new or updated reports.';
   renderSnapshot();
  }catch(error){if(active()){
   if(error.accessDenied||!authorizedUser||error.code==='42501'||error.status===401||error.status===403){
    clearPrivate();state.textContent=error.accessDenied?error.message:'Moderator access could not be verified. Refresh to retry.';
   }else{
    // Keep only the verified operator's generic recovery panel, not failed/stale evidence.
    reportsSnapshot=[];out.replaceChildren();coverage.textContent='';status.textContent='';
    filters.forEach(button=>button.disabled=true);
    queueState='unavailable';queueCheckedAt=null;
    incidentSummary.value='';incidentCopy.disabled=true;
    incidentStatus.textContent='Report queue unavailable; prepare a handoff or retry.';
    state.textContent='Private report queue unavailable. Refresh to retry.';
   }
  }}finally{if(active())refresh.disabled=false}
 }
 async function act(button,name,payload,question){
  if(busy||!authorizedUser)return;
  const version=generation,userId=authorizedUser,active=()=>version===generation&&authorizedUser===userId;
  if(!confirm(question))return;
  busy=true;controls(true);status.textContent='Verifying moderator access…';
  try{
   const verified=await verifyAccess(active);if(!active())return;
   if(verified!==userId)deny('Your account changed. Reload the moderation queue.');
   const {error}=await client.rpc(name,payload);if(!active())return;if(error)throw error;
   await load();
  }catch(error){if(active()){if(error.accessDenied){++generation;clearPrivate();state.textContent=error.message}else status.textContent='Action failed: '+(error.message||'Please try again.')}}
  finally{if(active()){busy=false;controls(false)}}
 }
 function renderSnapshot(){
  if(!authorizedUser)return;
  out.replaceChildren();
  const visible=reportFilter==='all'?reportsSnapshot:reportsSnapshot.filter(report=>report.status===reportFilter);
  const total=reportsSnapshot.length;
  state.textContent=total?total+(total===1?' report':' reports')+' returned by the private queue. Reports are allegations, not proof of wrongdoing.':'No reports returned by the private queue.';
  if(reportFilter!=='all')state.textContent+=' Showing '+visible.length+' '+reportFilter+' in the returned snapshot.';
  if(!visible.length&&total){
   const note=document.createElement('p');note.className='card';
   note.textContent='No '+reportFilter+' reports in the returned snapshot.'+(total>=100?' Other reports may exist beyond the first 100.':'');
   out.append(note);
  }
  for(const report of visible)renderReport(report);
 }
 function renderReport(report){
  const card=document.createElement('section');card.className='card';
  const heading=document.createElement('h2');heading.textContent=report.reason||'Report';card.append(heading);
  for(const [label,value] of Object.entries({Status:report.status,Created:report.created_at,Details:report.details,Listing:report.listing_id,'Reported user':report.reported_id,'Report ID':report.id})){
   const row=document.createElement('p'),title=document.createElement('strong');title.textContent=label+': ';row.append(title,document.createTextNode(String(value??'—')));card.append(row);
  }
  const reasonLabel=document.createElement('label');reasonLabel.textContent='Reason for review action (required)';
  const reviewReason=document.createElement('textarea');reviewReason.maxLength=1000;reviewReason.rows=3;reviewReason.placeholder='Explain the evidence and review decision';
  reasonLabel.append(reviewReason);card.append(reasonLabel);
  const actions=document.createElement('div');actions.className='controls';
  for(const [label,next] of [['Mark reviewing','reviewing'],['Resolve report','resolved'],['Reopen','open']]){
   const button=document.createElement('button');button.type='button';button.textContent=label;
   button.addEventListener('click',()=>{
    const reason=reviewReason.value.trim();
    if(reason.length<8){status.textContent='Enter a moderation reason of 8–1,000 characters before changing this report.';reviewReason.focus();return}
    act(button,'review_deckplay_report',{p_report_id:report.id,p_status:next,p_reason:reason,p_expected_status:report.status},'Change report status to '+next+'? This reason will be recorded in the private audit log.');
   });
   actions.append(button);
  }
  if(report.listing_id){
   const note=document.createElement('p');note.textContent='Listing removal is not available yet. Reviewing a report does not remove its listing.';card.append(note);
  }
  card.append(actions);out.append(card);
 }
 const allowedIssues=new Set([...incidentKind.options].map(option=>option.value));
 const allowedImpacts=new Set([...incidentImpact.options].map(option=>option.value));
 function clearIncidentDraft(){incidentSummary.value='';incidentCopy.disabled=true;incidentStatus.textContent=''}
 incidentKind.addEventListener('change',clearIncidentDraft);
 incidentImpact.addEventListener('change',clearIncidentDraft);
 incidentPrepare.addEventListener('click',()=>{
  if(!authorizedUser||incident.hidden||document.hidden)return;
  const issue=incidentKind.value,impact=incidentImpact.value;
  if(!allowedIssues.has(issue)||!allowedImpacts.has(impact))return;
  const host=window.location.hostname;
  const environment=host==='deckplayhq.com'||host==='www.deckplayhq.com'?'PUBLIC PRODUCTION (no actions authorized)'
   :host==='deckplay-hq-staging.cstivers56.workers.dev'?'PRIVATE STAGING'
   :host==='localhost'||host==='127.0.0.1'?'LOCAL PREVIEW (synthetic)'
   :'UNVERIFIED ORIGIN — confirm separately';
  const queue=queueState==='unavailable'?'Unavailable (verified staff; queue request failed)'
   :queueState==='loading'?'Still loading; no verified result'
   :queueState==='bounded snapshot'?'Loaded; limited to the first 100 reports'
   :queueState==='snapshot loaded'?'Loaded; snapshot only'
   :'Not checked';
  incidentSummary.value=[
   'DECKPLAY HQ — OPERATOR INCIDENT HANDOFF (DRAFT; NOT SENT)',
   'UTC time: '+new Date().toISOString(),
   'Environment: '+environment,
   'Affected operation: '+issue,
   'Observed impact: '+impact,
   'Moderation queue: '+queue,
   'Last successful queue check (UTC): '+(queueCheckedAt||'None this session'),
   '',
   'MANUAL RESPONSE:',
   '1. Verify the affected environment independently; staging is not production.',
   '2. Pause releases/feature changes and notify the owner.',
   '3. Do not share report contents, user identifiers, credentials or screenshots.',
   '4. Before any production rollback, verify fresh DB, Auth and Storage backups plus a rehearsed restore plan; obtain explicit owner approval.',
   '5. Verify recovery on the affected customer journey and record the result.',
   '',
   'No incident was filed. No feature control, rollback or account action was executed.'
  ].join('\n');
  incidentCopy.disabled=false;incidentStatus.textContent='Safe draft prepared locally. Nothing has been sent.';
 });
 incidentCopy.addEventListener('click',async()=>{
  if(!authorizedUser||incident.hidden||document.hidden||!incidentSummary.value)return;
  const version=generation,owner=authorizedUser,value=incidentSummary.value;
  const active=()=>version===generation&&owner===authorizedUser&&!incident.hidden&&!document.hidden;
  try{
   if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
   await navigator.clipboard.writeText(value);
   if(active())incidentStatus.textContent='Handoff copied. Share it only through an approved private channel.';
  }catch{
   if(active()){incidentSummary.focus();incidentSummary.select();incidentStatus.textContent='Clipboard unavailable. The handoff is selected for manual copying.'}
  }
 });
 filters.forEach(button=>button.addEventListener('click',()=>{
  if(!authorizedUser||busy||button.disabled)return;
  selectFilter(button.dataset.reportFilter);renderSnapshot();
 }));
 refresh.addEventListener('click',()=>{if(!refresh.disabled&&!busy)void load()});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){++generation;clearPrivate();selectFilter('all');state.textContent='Private reports hidden while this tab is inactive.'}
  else void load(); // Recheck both MFA and server role on return.
 });
 window.addEventListener('pagehide',()=>{++generation;clearPrivate();selectFilter('all')});
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION')return;
  ++generation;clearPrivate();selectFilter('all');
  state.textContent='Sign in and verify MFA to view private reports.';
  // Defer auth calls until Supabase finishes dispatching the auth event.
  if(session?.user&&event!=='PASSWORD_RECOVERY')setTimeout(()=>load(),0);
 });
 load();
})();
