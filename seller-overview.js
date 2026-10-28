/* Aggregate only the signed-in seller's own marketplace records. */
window.sellerOverview=(()=>{
 const panel=document.getElementById('sellerOverview'),content=document.getElementById('sellerOverviewContent');let version=0;
 function reset(){version++;panel.open=false;content.replaceChildren()}
 async function refresh(){
  if(!panel.open||!currentUser)return;const request=++version,owner=currentUser.id,epoch=messageAccountVersion;content.textContent='Loading your seller overview…';
  const valid=()=>request===version&&currentUser?.id===owner&&messageAccountVersion===epoch;
  try{
   const {data,error}=await supabaseClient.rpc('get_my_seller_overview');if(!valid())return;if(error||!data)throw Error('Your overview could not load. Try again.');
   const count=key=>{const value=Number(data[key]);if(!Number.isSafeInteger(value)||value<0)throw Error('Your overview could not load. Try again.');return value};
   const total=Number(data.active_asking_total);if(!Number.isFinite(total)||total<0)throw Error('Your overview could not load. Try again.');
   const stat=(label,key)=>`<div><dt>${label}</dt><dd>${count(key).toLocaleString()}</dd></div>`;
   content.innerHTML=`<dl class="seller-overview-stats">${stat('Active listings','active')}${stat('Reserved listings','reserved')}${stat('Listings marked sold','sold')}${stat('Removed listings','removed')}${stat('Price offers awaiting you','price_replies')}${stat('Trade proposals awaiting you','trade_replies')}</dl><p class="seller-asking-total"><strong>${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(total)}</strong> active asking total</p><p class="muted">Asking prices are not earnings. Buyer fees, tax and shipping are excluded. Sold counts reflect listing status, not verified payment or delivery. Deleted listings are excluded.</p><p><button type="button" class="ghost" data-seller-overview="inbox">Open inbox</button> <button type="button" class="ghost" data-seller-overview="refresh">Refresh overview</button></p>`;
  }catch{if(valid())content.innerHTML='<p role="status">Your overview could not load. Try again.</p><button type="button" class="ghost" data-seller-overview="refresh">Retry overview</button>'}
 }
 panel.addEventListener('toggle',()=>{if(panel.open)void refresh();else version++});
 panel.addEventListener('click',e=>{const action=e.target.closest('[data-seller-overview]')?.dataset.sellerOverview;if(action==='refresh')void refresh();if(action==='inbox')void showInboxPage()});
 return {reset,refresh};
})();
