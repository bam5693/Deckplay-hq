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
async function shareLink(kind,id,nativeShare){
 const url=sharedUrl(kind,id);
 if(!url){toast('Only published listings and collector profiles can be shared.');return}
 try{
  if(nativeShare&&typeof navigator.share==='function'){
   await navigator.share({title:kind==='listing'?'DeckPlay listing':'DeckPlay collector',url});
   return;
  }
  if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
   await navigator.clipboard.writeText(url);
   toast('Link copied. Anyone opening it still needs access to this site.');
   return;
  }
  window.prompt('Copy this DeckPlay link:',url);
 }catch(error){
  if(error&&error.name==='AbortError')return;
  toast('Could not share the link. Try Copy link instead.');
 }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-copy-kind],[data-share-kind],#copyOwnProfileLink');
 if(!button)return;
 const own=button.id==='copyOwnProfileLink';
 const kind=own?'collector':(button.dataset.copyKind||button.dataset.shareKind);
 const id=own?currentUser?.id:(button.dataset.copyId||button.dataset.shareId);
 void shareLink(kind,id,!!button.dataset.shareKind);
});
let attempted=false;
async function checkBlocked(sellerId,account,same){
 if(blockedCollectorIds.has(sellerId)){toast('This collector is blocked.');return false}
 if(!account)return true;
 const {data,error}=await supabaseClient.from('user_blocks').select('blocked_id').eq('blocker_id',account).eq('blocked_id',sellerId).maybeSingle();
 if(!same())return false;
 if(error){toast('Could not verify blocked collectors. Please retry later.');return false}
 if(data){toast('This collector is blocked.');return false}
 return true;
}
async function openSharedLinkOnce(){
 if(attempted)return;
 const params=new URLSearchParams(window.location.search);
 const listing=params.get('listing'),collector=params.get('collector');
 if(!listing&&!collector)return;
 attempted=true;
 if((listing&&collector)||!uuid.test(listing||collector)){toast('This shared link is invalid.');return}
 if(!supabaseClient){toast('Marketplace unavailable. Reload to try this link again.');return}
 const account=currentUser?.id||null;
 const same=()=>((currentUser?.id||null)===account);
 const id=listing||collector;
 try{
  if(collector){
   if(!await checkBlocked(id,account,same)||!same())return;
   await showPublicProfile(id);
   return;
  }
  const {data,error}=await supabaseClient.from('listings').select('id,title,description,category,tcg_game,collectible_subcategory,price,condition,accepts_trades,accepts_price_offers,image_urls,created_at,seller_id').eq('id',id).eq('status','active').maybeSingle();
  if(!same())return;
  if(error)throw error;
  if(!data||!data.seller_id){toast('This listing is no longer available.');return}
  if(!await checkBlocked(data.seller_id,account,same)||!same())return;
  const {data:profile}=await supabaseClient.from('profiles').select('username,display_name').eq('id',data.seller_id).maybeSingle();
  if(!same())return;
  showMainMarketplace();
  showDetails(marketplaceItemFromRow(data,profile));
 }catch(error){if(same())toast('Shared link could not be opened. Please try again.')}
}
window.deckplayOpenSharedLinkOnce=openSharedLinkOnce;
// The auth INITIAL_SESSION callback also invokes this after blocked collectors load.
// This fallback handles a cached session that initialized before this script loaded.
async function afterSession(){
 const params=new URLSearchParams(window.location.search);
 if(!params.has('listing')&&!params.has('collector'))return;
 if(!supabaseClient)return;
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
