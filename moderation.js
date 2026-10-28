/* UI privacy safeguards supplement server authorization; never grant roles here. */
(() => {
 const state=document.getElementById('state'),out=document.getElementById('reports'),status=document.getElementById('actionStatus');
 const client=window.supabase.createClient('https://yffruutknztvdyioovmp.supabase.co','sb_publishable_cHzM8sQmrqfcCH8lhESytg_FMJrQtCX');
 let generation=0,authorizedUser=null,busy=false;
 function clearPrivate(){authorizedUser=null;busy=false;out.replaceChildren();status.textContent=''}
 function controls(disabled){out.querySelectorAll('button').forEach(button=>button.disabled=disabled)}
 function deny(message){const error=Error(message);error.accessDenied=true;throw error}
 async function verifyAccess(active){
  const {data,error}=await client.auth.getUser();
  if(!active())return null;
  if(error||!data?.user)deny('Sign in to DeckPlay first, then return to this page.');
  const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(!active())return null;
  if(assurance.error||assurance.data?.currentLevel!=='aal2')deny('MFA required. Complete two-factor verification before using moderator tools. If MFA setup is unavailable, these tools remain locked.');
  const role=await client.rpc('is_deckplay_moderator');
  if(!active())return null;
  if(role.error||role.data!==true)deny('Access restricted to DeckPlay moderators. Moderator services must be configured before this queue can be used.');
  return data.user.id;
 }
 async function load(){
  const version=++generation,active=()=>version===generation;
  clearPrivate();state.textContent='Checking your moderator access…';
  try{
   const userId=await verifyAccess(active);if(!userId||!active())return;
   state.textContent='Loading private report queue…';
   const {data,error}=await client.rpc('moderation_report_queue');
   if(!active())return;if(error)throw error;
   if(!Array.isArray(data))throw Error('Moderator queue is unavailable.');
   authorizedUser=userId;
   state.textContent=data.length?data.length+' reports in this queue. Reports are allegations, not proof of wrongdoing.':'No reports in the queue.';
   for(const report of data)renderReport(report);
  }catch(error){if(active()){clearPrivate();state.textContent=error.message||'Unable to load moderation queue.'}}
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
 function renderReport(report){
  const card=document.createElement('section');card.className='card';
  const heading=document.createElement('h2');heading.textContent=report.reason||'Report';card.append(heading);
  for(const [label,value] of Object.entries({Status:report.status,Created:report.created_at,Details:report.details,Listing:report.listing_id,'Reported user':report.reported_id,'Report ID':report.id})){
   const row=document.createElement('p'),title=document.createElement('strong');title.textContent=label+': ';row.append(title,document.createTextNode(String(value??'—')));card.append(row);
  }
  const actions=document.createElement('div');actions.className='controls';
  for(const [label,next] of [['Mark reviewing','reviewing'],['Resolve report','resolved'],['Reopen','open']]){
   const button=document.createElement('button');button.type='button';button.textContent=label;
   button.addEventListener('click',()=>act(button,'review_deckplay_report',{p_report_id:report.id,p_status:next},'Change report status to '+next+'?'));
   actions.append(button);
  }
  if(report.listing_id){
   const button=document.createElement('button');button.type='button';button.className='danger';button.textContent='Remove reported listing';
   button.addEventListener('click',()=>act(button,'hide_deckplay_listing',{p_listing_id:report.listing_id,p_report_id:report.id},'Remove this listing? This administrative action requires a recorded moderation reason and server authorization.'));
   actions.append(button);
  }
  card.append(actions);out.append(card);
 }
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION')return;
  ++generation;clearPrivate();
  state.textContent='Sign in and verify MFA to view private reports.';
  // Defer auth calls until Supabase finishes dispatching the auth event.
  if(session?.user&&event!=='PASSWORD_RECOVERY')setTimeout(()=>load(),0);
 });
 load();
})();
