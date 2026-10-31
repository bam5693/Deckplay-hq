// Public listing and collector links. Never share private account, Inbox or session URLs.
(function(){
'use strict';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sharedUrl(kind,id){
 if(!['listing','collector'].includes(kind)||!uuid.test(id||''))return '';
 const url=new URL('/',window.location.origin);
 url.searchParams.set(kind,id);
 return url.href;
}
// Update the visible browser tab after a validated public item is resolved.
// Crawlers require server-rendered metadata; this is deliberately not an SEO claim.
function setSharedPageTitle(kind,label){
 const safe=String(label||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,90);
 if(!safe)return;
 document.title=safe+' | DeckPlay HQ';
}
// These tags improve in-browser previews only. Social crawlers need server-side
// public-data rendering and must never be given private account content.
function setListingBrowserMetadata(row){
 const title=String(row.title||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,90);
 if(!title)return;
 const description=String(row.description||'').replace(/\s+/g,' ').trim().slice(0,155)
   || 'Explore this collectible listing on DeckPlay HQ.';
 const update=(selector,value)=>{
  const node=document.querySelector(selector);
  if(node)node.setAttribute('content',value);
 };
 setSharedPageTitle('listing',title);
 update('meta[name="description"]',description);
 update('meta[property="og:title"]',title+' | DeckPlay HQ');
 update('meta[property="og:description"]',description);
 update('meta[name="twitter:title"]',title+' | DeckPlay HQ');
 update('meta[name="twitter:description"]',description);
}
// Browser-tab metadata for an already-loaded public collector profile only.
// A profile name is never fetched with privileged credentials or from private chats.
// Social crawlers still require explicitly scoped server-rendered previews.
function setCollectorBrowserMetadata(label){
 const title=String(label||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,90);
 if(!title)return;
 const description='Browse this collector\'s public profile and active collectibles on DeckPlay HQ.';
 setSharedPageTitle('collector',title);
 for(const [selector,value] of [
  ['meta[name="description"]',description],
  ['meta[property="og:title"]',title+' | DeckPlay HQ'],
  ['meta[property="og:description"]',description],
  ['meta[name="twitter:title"]',title+' | DeckPlay HQ'],
  ['meta[name="twitter:description"]',description]
 ]) document.querySelector(selector)?.setAttribute('content',value);
}
// A blocked clipboard or native share must not strand mobile collectors in a
// browser prompt. This is a public URL only; never insert private session data.
function showManualShareLink(url){
 let dialog=document.getElementById('deckplayShareFallback');
 if(!dialog){
  dialog=document.createElement('dialog');
  dialog.id='deckplayShareFallback';
  dialog.setAttribute('aria-labelledby','deckplayShareFallbackTitle');
  dialog.style.cssText='border:1px solid #d8dfeb;border-radius:14px;padding:22px;width:min(480px,calc(100vw - 32px));max-width:100%;color:#172033;box-shadow:0 20px 60px #14213d55';
  dialog.innerHTML='<form method="dialog"><h2 id="deckplayShareFallbackTitle" style="margin:0 0 8px">Copy public link</h2><p id="deckplayShareFallbackHelp">Sharing is unavailable in this browser. Select the link, then use your device\'s Copy action.</p><input id="deckplayShareFallbackInput" aria-label="Public share link" aria-describedby="deckplayShareFallbackHelp" readonly autocomplete="off" spellcheck="false" style="width:100%;font-size:16px;padding:12px;border:1px solid #9eacc5;border-radius:8px;margin:8px 0 16px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="ghost" id="deckplayShareFallbackSelect">Select link</button><button type="submit" class="primary">Close</button></div></form>';
  dialog.querySelector('#deckplayShareFallbackSelect').addEventListener('click',()=>{
   const input=dialog.querySelector('#deckplayShareFallbackInput');input.focus();input.select();
  });
  document.body.append(dialog);
 }
 const input=dialog.querySelector('#deckplayShareFallbackInput');
 input.value=url;
 if(!dialog.open)dialog.showModal();
 input.focus();input.select();
}
async function shareLink(kind,id,nativeShare){
 const url=sharedUrl(kind,id);
 if(!url){toast('Only published listings and collector profiles can be shared.');return}
 // A rejected native share should still try clipboard before manual selection.
 // A deliberate cancellation must not trigger any alternative sharing action.
 if(nativeShare&&typeof navigator.share==='function'){
  try{
   await navigator.share({title:kind==='listing'?'DeckPlay listing':'DeckPlay collector',url});
   return;
  }catch(error){
   if(error&&error.name==='AbortError')return;
  }
 }
 if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
  try{
   await navigator.clipboard.writeText(url);
   toast('Link copied. Anyone opening it still needs access to this site.');
   return;
  }catch(_error){
   // Clipboard permission can be denied on Android and private browsers.
  }
 }
 try{
  showManualShareLink(url);
 }catch(_error){
  toast('Could not share the link. Please retry from your browser.');
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-copy-kind],[data-share-kind],#copyOwnProfileLink,#shareOwnProfileLink');
 if(!button)return;
 const own=button.id==='copyOwnProfileLink'||button.id==='shareOwnProfileLink';
 const kind=own?'collector':(button.dataset.copyKind||button.dataset.shareKind);
 const id=own?currentUser?.id:(button.dataset.copyId||button.dataset.shareId);
 void shareLink(kind,id,button.id==='shareOwnProfileLink'||!!button.dataset.shareKind);
});
let attempted=false, opening=false;
function showRetry(message){
 let notice=document.getElementById('deckplaySharedLinkRetry');
 if(!notice){
  notice=document.createElement('aside');
  notice.id='deckplaySharedLinkRetry';
  notice.setAttribute('role','alert');
  notice.style.cssText='padding:16px;margin:16px 0;border:1px solid #aabbd0;border-radius:12px;background:#fff;color:#172033';
  const text=document.createElement('p'),button=document.createElement('button');
  button.type='button';button.className='primary';button.textContent='Retry shared link';
  button.addEventListener('click',()=>{void openSharedLinkOnce()});
  notice.append(text,button);
  (document.querySelector('main')||document.body).prepend(notice);
 }
 notice.querySelector('p').textContent=message;
 notice.hidden=false;
}
function clearRetry(){
 const notice=document.getElementById('deckplaySharedLinkRetry');
 if(notice)notice.remove();
}
async function checkBlocked(sellerId,account,same){
 if(blockedCollectorIds.has(sellerId)){toast('This collector is blocked.');return false}
 if(!account)return true;
 const {data,error}=await supabaseClient.from('user_blocks').select('blocked_id').eq('blocker_id',account).eq('blocked_id',sellerId).maybeSingle();
 if(!same())return false;
 if(error){showRetry('Could not verify blocked collectors. Retry opening this shared link.');return false}
 if(data){toast('This collector is blocked.');return false}
 return true;
}
async function openSharedLinkOnce(){
 if(attempted||opening)return;
 const params=new URLSearchParams(window.location.search);
 const listings=params.getAll('listing'),collectors=params.getAll('collector');
 // Reject duplicate or mixed parameters, including empty values. Never
 // silently open the first of multiple conflicting public destinations.
 if(!listings.length&&!collectors.length)return;
 if(listings.length+collectors.length!==1||!uuid.test((listings[0]||collectors[0])||'')){
  attempted=true;clearRetry();toast('This shared link is invalid.');return;
 }
 const listing=listings[0]||null,collector=collectors[0]||null;
 if(!supabaseClient){showRetry('Marketplace is still loading. Retry opening this shared link.');return}
 opening=true;
 const account=currentUser?.id||null;
 const same=()=>((currentUser?.id||null)===account);
 const id=listing||collector;
 try{
  if(collector){
   if(!await checkBlocked(id,account,same)||!same())return;
   const outcome=await showPublicProfile(id);
   if(!same())return;
   if(outcome==='ready'){
    setCollectorBrowserMetadata(document.getElementById('publicProfileTitle')?.textContent);
    attempted=true;clearRetry();return
   }
   // A failed profile lookup can leave a modal over the Retry button.
   closeModal('publicProfileModal');
   if(outcome==='missing'){
    attempted=true;clearRetry();toast('This collector profile is unavailable.');return;
   }
   showRetry('Collector profile could not load. Check your connection and retry.');
   return;
  }
  const {data,error}=await supabaseClient.from('listings').select('id,title,description,category,tcg_game,collectible_subcategory,price,condition,accepts_trades,accepts_price_offers,image_urls,created_at,seller_id').eq('id',id).eq('status','active').maybeSingle();
  if(!same())return;
  if(error)throw error;
  if(!data||!data.seller_id){attempted=true;clearRetry();toast('This listing is no longer available.');return}
  if(!await checkBlocked(data.seller_id,account,same)||!same())return;
  const {data:profile}=await supabaseClient.from('profiles').select('username,display_name').eq('id',data.seller_id).maybeSingle();
  if(!same())return;
  showMainMarketplace();
  showDetails(marketplaceItemFromRow(data,profile));
  setListingBrowserMetadata(data);
  attempted=true;clearRetry();
 }catch(error){if(same()){
  if(collector)closeModal('publicProfileModal');
  showRetry('Shared link could not be opened. Check your connection and retry.');
 }}
 finally{
  opening=false;
  if(!same()&&!attempted)showRetry('Your account changed. Retry opening this shared link.');
 }
}
window.deckplayOpenSharedLinkOnce=openSharedLinkOnce;
// The auth INITIAL_SESSION callback also invokes this after blocked collectors load.
// This fallback handles a cached session that initialized before this script loaded.
async function afterSession(){
 const params=new URLSearchParams(window.location.search);
 if(!params.has('listing')&&!params.has('collector'))return;
 if(!supabaseClient){showRetry('Marketplace is still loading. Retry opening this shared link.');return}
 try{
  const {data}=await supabaseClient.auth.getSession();
  if((currentUser?.id||null)!==(data?.session?.user?.id||null))return;
  await loadBlockedCollectors();
  await openSharedLinkOnce();
 }catch(error){/* A failed auth initialization must not expose private data. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void afterSession()},{once:true});
else void afterSession();
})();
