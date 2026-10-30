/* T8.3: private support tickets and self-service Help Center. No live payment/shipping. */
(() => {
  const modal = document.createElement("div");
  modal.id = "supportCenterModal";
  modal.className = "modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "supportCenterTitle");
  modal.innerHTML = `<div class="dialog wide" style="max-width:790px;max-height:90dvh;overflow:auto">
    <button type="button" class="close" id="supportClose" aria-label="Close help and support">×</button>
    <h2 id="supportCenterTitle">Help &amp; support</h2>
    <p class="muted">Private beta support. Never include passwords, card numbers, payment details or home addresses.</p>
    <details><summary><strong>How do I find, save or list an item?</strong></summary><p>Use Marketplace filters for cards, decks, video games, sports and other collectibles. Open an item to save it or contact its seller. Sign in and choose Sell an item to publish your own listing.</p></details>
    <details><summary><strong>How do messages and offers work?</strong></summary><p>Use Inbox to contact collectors, review offers and negotiate trades. A trade proposal is not a payment or shipping agreement. Block or report unwanted contact.</p></details>
    <details><summary><strong>Can I pay or print a shipping label?</strong></summary><p>No. Checkout and shipping are demonstrations only. No payment, payout, shipping label or purchase can be completed in this beta.</p></details>
    <details><summary><strong>How do I report a suspicious listing?</strong></summary><p>Use the Report action on the listing or collector. For account access, bugs or other help, open a private support ticket below.</p></details>
    <details><summary><strong>What if a trade or shipping arrangement goes wrong?</strong></summary><p>DeckPlay beta does not process payments, purchases or shipping. If a collector pressures you to pay off-platform, report the listing or collector. For a proposed trade, delivery concern or confusing shipping preview, send a private support ticket. Do not include addresses, tracking numbers or payment details.</p><button type="button" class="ghost" id="supportTradeConcern">Get help with a trade or shipping concern</button></details>
    <div id="supportSignIn"><p class="muted">Sign in to send feedback or open and follow private support tickets.</p><button type="button" class="primary" id="supportSignInButton">Sign in to send feedback</button></div>
    <section id="supportPrivate" hidden>
      <h3>Your support tickets</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button type="button" class="ghost" id="supportMine">My tickets</button>
        <button type="button" class="ghost" id="supportStaff" hidden>Staff queue</button>
        <button type="button" class="ghost" id="supportRefresh">Refresh</button>
      </div>
      <div id="supportStatusFilters" role="group" aria-label="Filter support tickets" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <button type="button" class="ghost" data-support-filter="all" aria-pressed="true">All tickets</button>
        <button type="button" class="ghost" data-support-filter="active" aria-pressed="false">Open tickets</button>
        <button type="button" class="ghost" data-support-filter="resolved" aria-pressed="false">Resolved tickets</button>
      </div>
      <p id="supportListStatus" class="status" role="status" aria-live="polite"></p>
      <div id="supportTicketList"></div>
      <section id="supportTicketDetail" hidden style="border-top:1px solid #cbd6e5;margin-top:15px;padding-top:12px">
        <h3 id="supportTicketTitle"></h3>
        <p id="supportTicketBody" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>
        <p id="supportTicketState" class="muted"></p>
        <div id="supportReplies" aria-live="polite"></div>
        <form id="supportReplyForm">
          <label for="supportReplyBody">Reply privately</label>
          <textarea id="supportReplyBody" minlength="2" maxlength="3000" rows="3" required></textarea>
          <p id="supportReplyStatus" class="status" role="status"></p>
          <button class="primary" type="submit">Send reply</button>
        </form>
        <div id="supportStaffControls" hidden>
          <label for="supportStatusSelect">Staff: update status</label>
          <select id="supportStatusSelect"><option value="open">Open</option><option value="waiting_on_staff">Waiting on support</option><option value="waiting_on_user">Waiting on collector</option><option value="resolved">Resolved</option></select>
          <button class="ghost" type="button" id="supportSetStatus">Save status</button>
        </div>
      </section>
      <form id="supportNewForm" style="border-top:1px solid #cbd6e5;margin-top:18px;padding-top:12px">
        <h3 id="supportNewTitle">Open a new support ticket</h3>
        <div id="supportCategoryField"><label for="supportCategory">Topic</label>
        <select id="supportCategory" required><option value="account">Account and sign-in</option><option value="listing">Listings and photos</option><option value="messages">Inbox and messages</option><option value="offers_trades">Offers and trades</option><option value="safety">Safety concern</option><option value="other">Other collectibles / feedback</option></select></div>
        <div id="supportFeedbackOptions" hidden>
          <label for="supportFeedbackKind">What would you like to share?</label>
          <select id="supportFeedbackKind"><option value="bug">Something isn't working</option><option value="idea">An improvement idea</option><option value="category">A missing collectible category</option><option value="other">Other feedback</option></select>
          <p class="muted">Your feedback is private to you and support. Please avoid personal information.</p>
        </div>
        <label for="supportSubject">Subject (8–120 characters)</label>
        <input id="supportSubject" minlength="8" maxlength="120" required>
        <label for="supportDescription">Details (20–3000 characters)</label>
        <textarea id="supportDescription" minlength="20" maxlength="3000" rows="4" required></textarea>
        <p id="supportCreateStatus" class="status" role="status" aria-live="polite"></p>
        <button type="submit" class="primary">Create private ticket</button>
      </form>
    </section>
  </div>`;
  document.body.append(modal);
  const el = id => document.getElementById(id);
  const status = (id, message) => { el(id).textContent = message || ""; };
  const date = value => new Date(value).toLocaleString();
  const labels = {open:"Open",waiting_on_staff:"Waiting on support",waiting_on_user:"Waiting on collector",resolved:"Resolved"};
  let userId = null, generation = 0, isStaff = false, staffView = false, ticketFilter = "all", selected = null, tickets = [], returnToFeedback = false, returnTopic = "feedback", feedbackMode = false;
  const feedbackKinds = {
    bug: {prefix:"[Bug] ", hint:"What went wrong?"},
    idea: {prefix:"[Idea] ", hint:"What could DeckPlay improve?"},
    category: {prefix:"[Category request] ", hint:"Which collectible category is missing?"},
    other: {prefix:"[Feedback] ", hint:"What would you like us to know?"}
  };
  function updateFeedbackKind() {
    if (!feedbackMode) return;
    const kind = feedbackKinds[el("supportFeedbackKind").value] || feedbackKinds.other;
    el("supportSubject").placeholder = kind.hint;
    el("supportSubject").maxLength = 120 - kind.prefix.length;
  }
  function setFeedbackMode(enabled) {
    feedbackMode = enabled;
    el("supportCategoryField").hidden = enabled;
    el("supportFeedbackOptions").hidden = !enabled;
    el("supportNewTitle").textContent = enabled ? "Share private beta feedback" : "Open a new support ticket";
    el("supportNewForm").querySelector('button[type="submit"]').textContent = enabled ? "Send private feedback" : "Create private ticket";
    el("supportCategory").value = enabled ? "other" : "account";
    el("supportSubject").placeholder = "";
    el("supportSubject").maxLength = 120;
    updateFeedbackKind();
  }
  el("supportFeedbackKind").addEventListener("change", updateFeedbackKind);
  const valid = (v,u) => v === generation && userId === u && modal.classList.contains("open");
  function clearPrivate() {
    selected = null; tickets = []; isStaff = false; staffView = false; ticketFilter = "all";
    modal.querySelectorAll("[data-support-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.supportFilter === ticketFilter)));
    el("supportTicketList").replaceChildren();
    el("supportTicketDetail").hidden = true;
    el("supportTicketTitle").textContent = "";
    el("supportTicketBody").textContent = "";
    el("supportTicketState").textContent = "";
    el("supportReplies").replaceChildren();
    el("supportStaff").hidden = true;
    el("supportStaffControls").hidden = true;
    el("supportReplyBody").value = "";
    ["supportListStatus","supportReplyStatus","supportCreateStatus"].forEach(id=>status(id,""));
  }
  const menu = el("accountMenu");
  if(menu) {
    const button=document.createElement("button");
    button.type="button";button.textContent="❔ Help & support";
    menu.insertBefore(button,el("signOutButton"));
    button.addEventListener("click",()=>{menu.hidden=true;show()});
  }
  const footer = document.querySelector("footer");
  if(footer){
    const button=document.createElement("button");
    button.type="button";button.className="ghost";button.textContent="Help & support";
    button.style.margin="8px auto";
    footer.append(button);
    button.addEventListener("click",show);
  }
  // Feedback uses the existing private ticket workflow, not a new public endpoint.
  // The event contains no account data or free-text content.
  function openFeedback() {
    void show();
    setFeedbackMode(true);
    if (!currentUser?.id) return; // Never reveal a previous account's draft.
    el("supportSubject").focus();
    status("supportCreateStatus", "Describe your experience without personal information.");
  }
  document.addEventListener("deckplay:open-feedback", openFeedback);
  function beginSupportSignIn(topic) {
    // Remember only the navigation intent, never a private draft or account ID.
    returnTopic = topic;
    returnToFeedback = true;
    closeModal(modal.id);
    openModal("authModal");
  }
  function openTradeConcern() {
    if (!currentUser?.id) { beginSupportSignIn("trade"); return; }
    void show();
    el("supportCategory").value = "offers_trades";
    el("supportSubject").value = "Trade or shipping concern";
    el("supportDescription").focus();
    status("supportCreateStatus", "Describe the proposed trade or shipping issue. Do not include addresses or payment details.");
  }
  el("supportTradeConcern").addEventListener("click", openTradeConcern);
  el("supportSignInButton").addEventListener("click", () => beginSupportSignIn("feedback"));
  // Cancelled sign-in must not unexpectedly reopen support after a later login.
  const authDialog = el("authModal");
  authDialog?.addEventListener("click", event => {
    if (event.target.closest('[data-close="authModal"]') || event.target === authDialog) { returnToFeedback = false; returnTopic = "feedback"; }
  });
  authDialog?.addEventListener("keydown", event => {
    if (event.key === "Escape") { returnToFeedback = false; returnTopic = "feedback"; }
  });
  el("supportClose").addEventListener("click",()=>closeModal(modal.id));
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal(modal.id)});
  async function show() {
    userId = currentUser?.id || null;
    clearPrivate();
    // Every visit starts with a blank draft, even when a different collector
    // previously opened feedback on this shared browser.
    el("supportNewForm").reset();
    setFeedbackMode(false);
    el("supportPrivate").hidden = !userId;
    el("supportSignIn").hidden = !!userId;
    openModal(modal.id);
    if(!userId)return;
    const v=++generation,u=userId;
    try{
      const {data,error}=await supabaseClient.rpc("is_deckplay_moderator");
      if(error)throw error;
      if(!valid(v,u))return;
      isStaff=data===true;
      el("supportStaff").hidden=!isStaff;
    }catch(error){if(valid(v,u))console.warn("Staff support access unavailable",error)}
    await loadTickets();
  }
  async function loadTickets() {
    if(!userId)return;
    const v=++generation,u=userId;
    status("supportListStatus","Loading private tickets…");
    el("supportTicketList").replaceChildren();
    try {
      let query=supabaseClient.from("support_tickets")
        .select("id,owner_id,category,subject,body,status,created_at,updated_at")
        .order("updated_at",{ascending:false}).limit(40);
      if(!staffView)query=query.eq("owner_id",u);
      // Filter in the database before the 40-ticket limit. Client-side filtering
      // would incorrectly show empty queues when older matching tickets exist.
      if(ticketFilter==="active")query=query.neq("status","resolved");
      if(ticketFilter==="resolved")query=query.eq("status","resolved");
      const {data,error}=await query;
      if(error)throw error;
      if(!valid(v,u))return;
      tickets=data||[];
      status("supportListStatus",tickets.length?"Select a ticket to view private replies.":ticketFilter==="active"?"No open tickets in this view.":ticketFilter==="resolved"?"No resolved tickets in this view.":"No tickets in this view.");
      for(const ticket of tickets){
        const button=document.createElement("button");
        button.type="button";button.className="ghost";
        button.style.cssText="display:block;width:100%;text-align:left;margin:6px 0;white-space:normal;overflow-wrap:anywhere";
        button.textContent=ticket.subject+" — "+(labels[ticket.status]||ticket.status)+" · "+date(ticket.updated_at);
        button.addEventListener("click",()=>showTicket(ticket.id));
        el("supportTicketList").append(button);
      }
      if(selected&&tickets.some(t=>t.id===selected))await showTicket(selected);
      else {selected=null;el("supportTicketDetail").hidden=true}
    }catch(error){
      if(valid(v,u))status("supportListStatus","Tickets could not load. Refresh to retry.");
    }
  }
  async function showTicket(id){
    const ticket=tickets.find(t=>t.id===id);
    if(!ticket)return;
    selected=id;
    const v=++generation,u=userId;
    el("supportTicketDetail").hidden=false;
    el("supportTicketTitle").textContent=ticket.subject;
    el("supportTicketBody").textContent=ticket.body;
    el("supportTicketState").textContent=(labels[ticket.status]||ticket.status)+" · "+date(ticket.created_at);
    el("supportReplyForm").hidden=ticket.status==="resolved";
    el("supportStaffControls").hidden=!isStaff;
    el("supportStatusSelect").value=ticket.status;
    el("supportReplies").textContent="Loading replies…";
    status("supportReplyStatus","");
    try{
      const {data,error}=await supabaseClient.from("support_ticket_replies")
        .select("id,author_id,is_staff,body,created_at")
        .eq("ticket_id",id).order("created_at",{ascending:true}).order("id",{ascending:true}).limit(100);
      if(error)throw error;
      if(!valid(v,u)||selected!==id)return;
      el("supportReplies").replaceChildren();
      for(const reply of data||[]){
        const article=document.createElement("article");
        article.style.cssText="border:1px solid #cbd6e5;border-radius:10px;padding:10px;margin:8px 0;overflow-wrap:anywhere";
        const header=document.createElement("strong");
        header.textContent=(reply.is_staff?"Support":reply.author_id===u?"You":"Collector")+" · "+date(reply.created_at);
        const body=document.createElement("p");body.style.whiteSpace="pre-wrap";body.textContent=reply.body;
        article.append(header,body);el("supportReplies").append(article);
      }
      if(!(data||[]).length)el("supportReplies").textContent="No replies yet.";
    }catch(error){
      if(valid(v,u)&&selected===id)el("supportReplies").textContent="Replies could not load. Reopen this ticket to retry.";
    }
  }
  modal.querySelectorAll("[data-support-filter]").forEach(button => button.addEventListener("click", () => {
    const next = button.dataset.supportFilter;
    if(!["all","active","resolved"].includes(next) || next===ticketFilter) return;
    ticketFilter = next;
    modal.querySelectorAll("[data-support-filter]").forEach(item => item.setAttribute("aria-pressed", String(item===button)));
    selected=null;
    el("supportTicketDetail").hidden=true;
    el("supportReplies").replaceChildren();
    void loadTickets();
  }));
  el("supportMine").addEventListener("click",()=>{staffView=false;selected=null;el("supportTicketDetail").hidden=true;loadTickets()});
  el("supportStaff").addEventListener("click",()=>{if(!isStaff)return;staffView=true;selected=null;el("supportTicketDetail").hidden=true;loadTickets()});
  el("supportRefresh").addEventListener("click",loadTickets);
  el("supportNewForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!userId)return;
    const form=e.currentTarget,button=form.querySelector('button[type="submit"]');
    if(button.disabled)return;
    const v=generation,u=userId;
    const rawSubject=el("supportSubject").value.trim();
    const prefix=feedbackMode?(feedbackKinds[el("supportFeedbackKind").value]||feedbackKinds.other).prefix:"";
    const subject=prefix+rawSubject;
    if(rawSubject.length<8||subject.length>120){
      status("supportCreateStatus","Enter a subject of at least 8 characters that fits the limit.");
      return;
    }
    button.disabled=true;status("supportCreateStatus","Submitting…");
    try{
      const {data,error}=await supabaseClient.rpc("create_support_ticket",{
        p_category:feedbackMode?"other":el("supportCategory").value,p_subject:subject,
        p_body:el("supportDescription").value.trim()
      });
      if(error)throw error;
      if(!valid(v,u))return;
      form.reset();staffView=false;selected=data;
      status("supportCreateStatus","Ticket created. You can follow replies below.");
      await loadTickets();
    }catch(error){if(valid(v,u))status("supportCreateStatus",error.message||"Could not create ticket. Try again.")}
    finally{button.disabled=false}
  });
  el("supportReplyForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!selected||!userId)return;
    const form=e.currentTarget,button=form.querySelector('button[type="submit"]');
    if(button.disabled)return;
    const id=selected,u=userId,v=generation;
    button.disabled=true;status("supportReplyStatus","Sending…");
    try{
      const {error}=await supabaseClient.rpc("reply_support_ticket",{p_ticket_id:id,p_body:el("supportReplyBody").value.trim()});
      if(error)throw error;
      if(!valid(v,u)||selected!==id)return;
      el("supportReplyBody").value="";
      status("supportReplyStatus","Reply sent.");
      await loadTickets();
    }catch(error){if(valid(v,u)&&selected===id)status("supportReplyStatus",error.message||"Reply failed. Your text is preserved.")}
    finally{button.disabled=false}
  });
  el("supportSetStatus").addEventListener("click",async e=>{
    if(!isStaff||!selected||!userId)return;
    const button=e.currentTarget,id=selected,u=userId,v=generation;
    if(button.disabled)return;
    button.disabled=true;
    try{
      const {error}=await supabaseClient.rpc("set_support_ticket_status",{p_ticket_id:id,p_status:el("supportStatusSelect").value});
      if(error)throw error;
      if(valid(v,u)&&selected===id)await loadTickets();
    }catch(error){if(valid(v,u))status("supportReplyStatus",error.message||"Could not update ticket status.")}
    finally{button.disabled=false}
  });
  supabaseClient.auth.onAuthStateChange((_event,session)=>{
    const next=session?.user?.id||null;
    if(next===userId)return;
    userId=next;++generation;clearPrivate();
    el("supportNewForm").reset(); // Never carry a private draft into another account.
    if(modal.classList.contains("open"))closeModal(modal.id);
    if(next && returnToFeedback){
      returnToFeedback=false;
      const topic = returnTopic;
      returnTopic = "feedback";
      // Let the application's own auth listener finish updating currentUser first.
      setTimeout(()=>{
        if(currentUser?.id===next) {
          if(topic==="trade")openTradeConcern();
          else openFeedback();
        }
      },0);
    }
  });
})();
