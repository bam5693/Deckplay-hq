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
    <details><summary><strong>What if my listing or account was restricted?</strong></summary><p>You can ask support to review a moderation decision. Explain which listing or action you want reviewed and why, without including passwords, payment information or private addresses. Sending a request does not automatically reverse a restriction.</p><button type="button" class="ghost" id="supportModerationReview">Request a moderation review</button></details>
    <details><summary><strong>What if a trade or shipping arrangement goes wrong?</strong></summary><p>DeckPlay beta does not process payments, purchases or shipping. If a collector pressures you to pay off-platform, report the listing or collector. For a proposed trade, delivery concern or confusing shipping preview, send a private support ticket. Do not include addresses, tracking numbers or payment details.</p><button type="button" class="ghost" id="supportTradeConcern">Get help with a trade or shipping concern</button></details>
    <section id="supportBetaStatusNotice" aria-label="DeckPlay beta access status" style="border:1px solid #819c9655;border-radius:12px;padding:12px;margin:14px 0">
      <strong id="supportBetaStatusHeading">Beta access status</strong>
      <p id="supportBetaStatusDetail" class="muted" role="status" aria-live="polite"></p>
      <p class="muted" style="font-size:12px;margin-bottom:0">Status is updated through an approved DeckPlay release, not by support tickets. Do not submit personal information or payment to request an invitation.</p>
    </section>
    <details id="supportBetaAccessGuide"><summary><strong>How does the private beta work, and can I request access?</strong></summary><p>DeckPlay is preparing a limited collector beta. An account or support request does not guarantee an invitation or a launch date. Do not send passwords, payment information, addresses or identity documents to request access. If invitations open, DeckPlay will communicate the official process through its own website.</p></details>
    <details id="supportBetaIssueGuide"><summary><strong>I found a problem. How will I know what happens next?</strong></summary><p>Sign in and open a private support ticket describing what you were trying to do, what happened and which device you used. You can return to Help &amp; support → My tickets to read replies and check whether your report is open, waiting or resolved. A report is not an automatic fix or a promise of a response time. For immediate safety concerns, use the listing or collector Report action. Never share passwords, payment details or private addresses.</p></details>
    <div id="supportSignIn"><p class="muted">Sign in to send feedback or open and follow private support tickets.</p><button type="button" class="primary" id="supportSignInButton">Sign in to send feedback</button></div>
    <section id="supportPrivate" hidden>
      <h3>Your support tickets</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button type="button" class="ghost" id="supportMine">My tickets</button>
        <button type="button" class="ghost" id="supportStaff" hidden>Staff queue</button>
        <button type="button" class="ghost" id="supportStaffSafety" hidden aria-pressed="false">Safety queue</button>
        <button type="button" class="ghost" id="supportRefresh">Refresh</button>
      </div>
      <div id="supportStatusFilters" role="group" aria-label="Filter support tickets" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <button type="button" class="ghost" data-support-filter="all" aria-pressed="true">All tickets</button>
        <button type="button" class="ghost" data-support-filter="active" aria-pressed="false">Open tickets</button>
        <button type="button" class="ghost" data-support-filter="resolved" aria-pressed="false">Resolved tickets</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><label for="supportTicketCategory">Ticket topic</label><select id="supportTicketCategory" aria-label="Filter support tickets by topic"><option value="all">All topics</option><option value="account">Account and sign-in</option><option value="listing">Listings and photos</option><option value="messages">Inbox and messages</option><option value="offers_trades">Offers and trades</option><option value="safety">Safety concerns</option><option value="other">Other collectibles / feedback</option></select></div>
      <section id="supportStaffOverview" hidden aria-label="Verified staff support queue overview" style="border:1px solid #819c9660;border-radius:12px;padding:12px;margin:10px 0">
        <strong>Staff support overview</strong>
        <p class="muted" style="font-size:12px;margin:5px 0">Live queue totals from the private support database. No private messages or customer information are included.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div style="flex:1 1 120px;border:1px solid #819c9640;border-radius:10px;padding:10px"><strong id="supportStaffOpenCount" aria-label="Open support tickets">—</strong><p style="margin:4px 0">Unresolved tickets</p></div>
          <div style="flex:1 1 120px;border:1px solid #819c9640;border-radius:10px;padding:10px"><strong id="supportStaffSafetyCount" aria-label="Unresolved safety reports">—</strong><p style="margin:4px 0">Safety reports</p></div>
        </div>
        <p id="supportStaffOverviewStatus" class="status" role="status" aria-live="polite"></p>
        <section id="supportFeedbackOverview" aria-label="Voluntary marketplace feedback counts" style="border-top:1px solid #819c9640;margin-top:12px;padding-top:10px">
          <strong>Opt-in marketplace feedback</strong>
          <p class="muted" style="font-size:12px;margin:5px 0">Counts only feedback tickets people chose to send, not all searches, clicks or conversions. No search terms, message bodies or account identities are queried.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div style="flex:1 1 120px"><strong id="supportFeedbackEmptyCount" aria-label="Voluntary no-result reports">—</strong><p style="margin:4px 0">No-result reports</p><button type="button" class="ghost" data-feedback-queue="empty" aria-label="Review no-result reports" style="padding:7px 10px;margin-top:5px">Review reports</button></div>
            <div style="flex:1 1 120px"><strong id="supportFeedbackDiscoveryCount" aria-label="Voluntary discovery reports">—</strong><p style="margin:4px 0">Discovery reports</p><button type="button" class="ghost" data-feedback-queue="discovery" aria-label="Review discovery reports" style="padding:7px 10px;margin-top:5px">Review reports</button></div>
            <div style="flex:1 1 120px"><strong id="supportFeedbackContactCount" aria-label="Voluntary contact-friction reports">—</strong><p style="margin:4px 0">Contact-friction reports</p><button type="button" class="ghost" data-feedback-queue="contact" aria-label="Review contact-friction reports" style="padding:7px 10px;margin-top:5px">Review reports</button></div>
          </div>
          <p id="supportFeedbackOverviewStatus" class="status" role="status" aria-live="polite"></p>
        </section>
      </section>
      <div id="supportFeedbackQueueNotice" hidden role="status" style="padding:10px;margin:8px 0;border:1px solid #819c9640;border-radius:10px"><span id="supportFeedbackQueueLabel"></span> <button type="button" class="ghost" id="supportFeedbackQueueClear">Show all staff tickets</button></div>
      <div id="supportStaffSortWrap" hidden style="gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0">
        <label for="supportStaffSort">Staff queue order</label>
        <select id="supportStaffSort" aria-label="Sort staff support queue"><option value="newest">Latest activity first</option><option value="oldest">Longest waiting first</option></select>
      </div>
      <p id="supportListStatus" class="status" role="status" aria-live="polite"></p>
      <div id="supportTicketList"></div>
      <button type="button" class="ghost" id="supportLoadMore" hidden>Load older tickets</button>
      <section id="supportTicketDetail" hidden style="border-top:1px solid #cbd6e5;margin-top:15px;padding-top:12px">
        <h3 id="supportTicketTitle"></h3>
        <p id="supportTicketBody" style="white-space:pre-wrap;overflow-wrap:anywhere"></p>
        <p id="supportTicketState" class="muted"></p>
        <p id="supportTicketNextStep" class="muted" role="status" aria-live="polite"></p>
        <div id="supportReplies" aria-live="polite"></div>
        <p id="supportRepliesStatus" class="status" role="status" aria-live="polite"></p>
        <button type="button" class="ghost" id="supportRepliesLoadMore" hidden>Load earlier replies</button>
        <form id="supportReplyForm">
          <label for="supportReplyBody">Reply privately</label>
          <textarea id="supportReplyBody" minlength="2" maxlength="3000" rows="3" aria-describedby="supportReplyCount" required></textarea>
          <p id="supportReplyCount" class="muted" aria-live="off">0 / 3000 characters</p>
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
          <label for="supportFeedbackArea">What part of DeckPlay is this about?</label>
          <select id="supportFeedbackArea">
            <option value="general">General feedback</option>
            <option value="marketplace">Marketplace search and filters</option>
            <option value="trading_cards">Trading cards (TCG)</option>
            <option value="sports_cards">Sports cards</option>
            <option value="video_games">Video games</option>
            <option value="consoles">Consoles</option>
            <option value="controllers">Controllers</option>
            <option value="accessories">Accessories</option>
            <option value="collectibles">Collectibles and memorabilia</option>
            <option value="other">Other collectibles</option>
            <option value="listing">Listing details and photos</option>
            <option value="inbox">Inbox and messages</option>
            <option value="trades">Offers and trades</option>
            <option value="profile">Collector profiles</option>
            <option value="account">Sign-in and account</option>
          </select>
          <p class="muted">Your feedback is private to you and support. Please avoid personal information.</p>
          <button type="button" class="ghost" id="supportFeedbackDiscard" hidden>Discard unsent feedback</button>
        </div>
        <div id="supportTradeConcernFields" hidden>
          <label for="supportTradeConcernKind">What happened?</label>
          <select id="supportTradeConcernKind">
            <option value="proposal">Question or problem with a proposed trade</option>
            <option value="shipping">Confusing shipping estimate or preview</option>
            <option value="pressure">Someone asked me to pay outside DeckPlay</option>
          </select>
          <p class="muted" id="supportTradeConcernHint">DeckPlay does not process payments or shipping. Describe only the proposed trade, without addresses, tracking numbers or payment details.</p>
        </div>
        <div id="supportListingReportFields" hidden>
          <p id="supportReportListingIdentifier" class="muted"></p>
          <label for="supportReportReason">What concerns you about this listing?</label>
          <select id="supportReportReason" required>
            <option value="counterfeit">Counterfeit or misrepresented collectible</option>
            <option value="misleading">Misleading photos or description</option>
            <option value="scam">Possible scam or payment pressure</option>
            <option value="stolen">Possibly stolen property</option>
            <option value="other">Other safety concern</option>
          </select>
          <p class="muted">Reports go privately to support for review. A report never automatically removes a listing. Do not include addresses, passwords, card details or tracking numbers.</p>
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
  // Owner-controlled release status. Changing this requires an intentional reviewed deployment.
  // It does NOT grant accounts access, send invitations, or make a waitlist.
  const betaAccessPhase = "in-development";
  const betaStatusCopy = Object.freeze({
    "in-development": ["Invitations not yet announced", "DeckPlay is still being built and tested. There is no public invitation request form or confirmed beta opening date."],
    "invite-only": ["Invite-only beta", "Only collectors specifically invited by DeckPlay can participate. This page does not issue invitations or collect access requests."],
    "paused": ["Beta access paused", "New beta access is temporarily paused. Existing support tickets can still be followed here."]
  });
  const betaStatus = betaStatusCopy[betaAccessPhase] || betaStatusCopy["in-development"];
  document.getElementById("supportBetaStatusHeading").textContent = betaStatus[0];
  document.getElementById("supportBetaStatusDetail").textContent = betaStatus[1];
  const el = id => document.getElementById(id);
  const status = (id, message) => { el(id).textContent = message || ""; };
  const date = value => new Date(value).toLocaleString();
  const labels = {open:"Open",waiting_on_staff:"Waiting on support",waiting_on_user:"Waiting on collector",resolved:"Resolved"};
  const nextSteps = {open:"Your ticket has been recorded. Check My tickets for updates; no response time is guaranteed.",waiting_on_staff:"Your ticket is waiting on support. You can check this page for replies.",waiting_on_user:"Support is waiting for your response. Read the replies below and respond if more information is needed.",resolved:"This ticket is marked resolved. If the problem continues, open a new support ticket."};
  let userId = null, generation = 0, isStaff = false, staffView = false, staffSafetyOnly = false, staffSort = "newest", ticketFilter = "all", ticketCategory = "all", feedbackQueueSubject = null, selected = null, tickets = [], ticketOffset = 0, ticketListRequest = 0, loadingTickets = false, moreTickets = false, replyOffset = 0, moreReplies = false, loadingReplies = false, replyRequest = 0, returnToFeedback = false, returnTopic = "feedback", feedbackMode = false, tradeConcernMode = false, listingReportId = null, pendingReportId = null, viewGeneration = 0, createRequest = 0, replySubmitRequest = 0, statusSubmitRequest = 0;
  // Drafts are tab-memory only, keyed by ticket and purged on account/view reset.
  const replyDrafts = new Map();
  // Unsaved beta feedback stays only in this tab and only for the same account.
  // Do not use localStorage: shared devices must not retain private feedback.
  let feedbackDraft = null;
  function captureFeedbackDraft(autoGenerated=false){
    if(!feedbackMode || !userId)return;
    const subject=el("supportSubject").value,body=el("supportDescription").value;
    feedbackDraft=subject.trim() || body.trim()
      ? {owner:userId,kind:el("supportFeedbackKind").value,area:el("supportFeedbackArea").value,subject,body,autoGenerated:autoGenerated===true} : null;
    el("supportFeedbackDiscard").hidden=!feedbackDraft;
  }
  function restoreFeedbackDraft(){
    if(!feedbackDraft || feedbackDraft.owner!==userId)return false;
    el("supportFeedbackKind").value=feedbackDraft.kind;
    el("supportFeedbackArea").value=feedbackDraft.area||"general";
    updateFeedbackKind();
    el("supportSubject").value=feedbackDraft.subject;
    el("supportDescription").value=feedbackDraft.body;
    el("supportFeedbackDiscard").hidden=false;
    return true;
  }
  const feedbackQueueSubjects = Object.freeze({empty:"[Idea] Improve marketplace search results",discovery:"[Idea] Improve listing discovery",contact:"[Idea] Improve listing contact experience"});
  const feedbackQueueLabels = Object.freeze({empty:"No-result reports",discovery:"Discovery reports",contact:"Contact-friction reports"});
  const feedbackKinds = {
    bug: {prefix:"[Bug] ", hint:"What went wrong?"},
    idea: {prefix:"[Idea] ", hint:"What could DeckPlay improve?"},
    category: {prefix:"[Category request] ", hint:"Which collectible category is missing?"},
    other: {prefix:"[Feedback] ", hint:"What would you like us to know?"}
  };
  // A fixed vocabulary keeps the feedback context useful without copying search
  // queries, listing IDs, account identities or arbitrary user-provided metadata.
  const feedbackAreas = Object.freeze({
    general:"General feedback",marketplace:"Marketplace search and filters",
    trading_cards:"Trading cards (TCG)",sports_cards:"Sports cards",
    video_games:"Video games",consoles:"Consoles",controllers:"Controllers",
    accessories:"Accessories",collectibles:"Collectibles and memorabilia",
    other:"Other collectibles",listing:"Listing details and photos",
    inbox:"Inbox and messages",trades:"Offers and trades",
    profile:"Collector profiles",account:"Sign-in and account"
  });
  // Search/contact feedback starts as a prefilled template. Require an actual
  // collector answer rather than creating a ticket from placeholder text alone.
  // Ordinary hand-written feedback is unaffected.
  function feedbackTemplateNeedsAnswer(value) {
    const text=String(value||"").trim();
    return /^(?:Marketplace search feedback \(optional, private\)|Listing contact feedback \(optional, private\))\n/.test(text)
      && /(?:What I hoped to find|What would help me contact the seller):\s*$/.test(text);
  }

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
    el("supportFeedbackDiscard").hidden = !enabled || !feedbackDraft || feedbackDraft.owner!==userId;
    if(enabled)setTradeConcernMode(false);
    el("supportNewTitle").textContent = enabled ? "Share private beta feedback" : "Open a new support ticket";
    el("supportNewForm").querySelector('button[type="submit"]').textContent = enabled ? "Send private feedback" : "Create private ticket";
    el("supportCategory").value = enabled ? "other" : "account";
    el("supportSubject").placeholder = "";
    el("supportSubject").maxLength = 120;
    // Reserve room for the fixed area label inside the existing 3000-character RPC body limit.
    el("supportDescription").maxLength = enabled ? 2900 : 3000;
    updateFeedbackKind();
  }
  const tradeConcerns = {
    proposal:{prefix:"",category:"offers_trades",hint:"DeckPlay trades are proposals only. Describe the concern without private contact or payment information."},
    shipping:{prefix:"[Shipping preview] ",category:"offers_trades",hint:"Shipping is only a preview. No label, purchase or delivery is handled by DeckPlay."},
    pressure:{prefix:"[Payment pressure] ",category:"safety",hint:"Do not send money or credentials off-platform. This is a private safety report for staff review, not a payment dispute or refund."}
  };
  function updateTradeConcernKind() {
    if(!tradeConcernMode)return;
    const kind=tradeConcerns[el("supportTradeConcernKind").value]||tradeConcerns.proposal;
    el("supportTradeConcernHint").textContent=kind.hint;
    el("supportSubject").maxLength=120-kind.prefix.length;
    el("supportDescription").maxLength=2800;
  }
  function setTradeConcernMode(enabled) {
    tradeConcernMode=enabled;
    el("supportTradeConcernFields").hidden=!enabled;
    if(enabled){
      el("supportCategoryField").hidden=true;
      el("supportFeedbackOptions").hidden=true;
      el("supportNewTitle").textContent="Get help with a trade or shipping concern";
      el("supportCategory").value="offers_trades";
      el("supportSubject").value="Trade or shipping concern";
      updateTradeConcernKind();
    }else{
      el("supportDescription").maxLength=listingReportId?2700:3000;
      el("supportSubject").maxLength=120;
    }
  }
  el("supportTradeConcernKind").addEventListener("change",updateTradeConcernKind);
  const listingUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const reportReasons = {
    counterfeit:"Counterfeit or misrepresented collectible",
    misleading:"Misleading photos or description",
    scam:"Possible scam or payment pressure",
    stolen:"Possibly stolen property",
    other:"Other safety concern"
  };
  function setListingReportMode(id = null) {
    listingReportId = id && listingUuid.test(id) ? id : null;
    if(listingReportId)setTradeConcernMode(false);
    el("supportListingReportFields").hidden = !listingReportId;
    el("supportCategoryField").hidden = !!listingReportId || feedbackMode;
    el("supportFeedbackOptions").hidden = !feedbackMode;
    el("supportNewTitle").textContent = listingReportId ? "Report this listing privately" : feedbackMode ? "Share private beta feedback" : "Open a new support ticket";
    el("supportNewForm").querySelector('button[type="submit"]').textContent = listingReportId ? "Send listing report" : feedbackMode ? "Send private feedback" : "Create private ticket";
    el("supportReportListingIdentifier").textContent = listingReportId ? "Listing ID: "+listingReportId : "";
    el("supportCategory").value = listingReportId ? "safety" : feedbackMode ? "other" : "account";
    el("supportSubject").value = listingReportId ? "Listing report for safety review" : "";
    el("supportSubject").readOnly = !!listingReportId;
    el("supportDescription").maxLength = listingReportId ? 2700 : 3000;
    if(listingReportId)el("supportReportReason").value = "counterfeit";
  }
  el("supportFeedbackKind").addEventListener("change", updateFeedbackKind);
  for(const eventName of ["input","change"])
    el("supportNewForm").addEventListener(eventName,()=>captureFeedbackDraft());
  el("supportFeedbackDiscard").addEventListener("click",()=>{
    feedbackDraft=null;
    el("supportSubject").value="";
    el("supportDescription").value="";
    el("supportFeedbackKind").value="bug";
    el("supportFeedbackArea").value="general";
    updateFeedbackKind();
    el("supportFeedbackDiscard").hidden=true;
    status("supportCreateStatus","Unsent feedback discarded. You can start a new report.");
    el("supportSubject").focus();
  });
  const valid = (v,u) => v === generation && userId === u && modal.classList.contains("open");
  // Read refreshes increment generation. Writes must instead survive unrelated
  // ticket-list refreshes, while still being discarded after account/view changes.
  const validWrite = (v,u) => v === viewGeneration && userId === u && modal.classList.contains("open");
  function clearPrivate() {
    ++createRequest; // A stale request must never unlock another account's submit button.
    el("supportNewForm").querySelector('button[type="submit"]').disabled = false;
    ++replySubmitRequest; // Invalidate any previous account's pending reply.
    el("supportReplyForm").querySelector('button[type="submit"]').disabled = false;
    ++statusSubmitRequest; // Never unlock a different account's pending staff status save.
    el("supportSetStatus").disabled = false;
    ++ticketListRequest; loadingTickets = false; moreTickets = false; ticketOffset = 0;
    el("supportLoadMore").hidden = true; el("supportLoadMore").disabled = false;
    selected = null; tickets = []; replyDrafts.clear(); isStaff = false; staffView = false; staffSafetyOnly = false; staffSort = "newest"; ticketFilter = "all";
    el("supportStaffSort").value = "newest"; el("supportStaffSortWrap").hidden = true; ticketCategory = "all";
    el("supportTicketCategory").value = "all"; el("supportTicketCategory").disabled = false;
    feedbackQueueSubject=null;el("supportFeedbackQueueNotice").hidden=true;el("supportFeedbackQueueLabel").textContent="";
    modal.querySelectorAll("[data-support-filter]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.supportFilter === ticketFilter)));
    el("supportTicketList").replaceChildren();
    el("supportTicketDetail").hidden = true;
    el("supportTicketTitle").textContent = "";
    el("supportTicketBody").textContent = "";
    el("supportTicketState").textContent = "";
    el("supportTicketNextStep").textContent = "";
    ++replyRequest; replyOffset = 0; moreReplies = false; loadingReplies = false;
    el("supportReplies").replaceChildren();
    el("supportRepliesLoadMore").hidden = true;
    el("supportRepliesLoadMore").disabled = false;
    status("supportRepliesStatus","");
    el("supportStaff").hidden = true;
    el("supportStaffSafety").hidden = true;
    el("supportStaffSafety").setAttribute("aria-pressed","false");
    el("supportStaffControls").hidden = true;
    el("supportStaffOverview").hidden = true;
    el("supportStaffOpenCount").textContent = "—";
    el("supportStaffSafetyCount").textContent = "—";
    status("supportStaffOverviewStatus","");
    for(const id of ["supportFeedbackEmptyCount","supportFeedbackDiscoveryCount","supportFeedbackContactCount"])el(id).textContent="—";
    status("supportFeedbackOverviewStatus","");
    el("supportReplyBody").value = "";
    updateReplyCount();
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
    const restored=restoreFeedbackDraft();
    el("supportSubject").focus();
    status("supportCreateStatus", restored
      ? "Your unsent feedback is restored in this tab. Discard it to start over."
      : "Describe your experience without personal information.");
  }
  document.addEventListener("deckplay:open-feedback", openFeedback);
  // Search feedback is user-initiated and uses the existing private support workflow.
  // Accept only a tiny fixed vocabulary; never copy search text, prices, item IDs or identities.
  function openSearchFeedback(event) {
    const detail=event?.detail||{};
    if(!["empty","results","detail"].includes(detail.outcome))return;
    const allowed=["All","Trading Cards","Video Games","Consoles & Controllers","Collectibles"];
    const category=allowed.includes(detail.category)?detail.category:"All";
    openFeedback();
    if(!currentUser?.id)return; // Signed-out navigation retains intent only, never search context.
    // An opt-in search report must never overwrite a collector's existing draft.
    if(feedbackDraft?.owner===userId && !feedbackDraft.autoGenerated){
      status("supportCreateStatus","Your unsent feedback was restored. Discard it before starting a new search report.");
      return;
    }
    el("supportFeedbackKind").value="idea";
    el("supportFeedbackArea").value=detail.outcome==="detail"?"listing":"marketplace";
    updateFeedbackKind();
    el("supportSubject").value=detail.outcome==="empty"?"Improve marketplace search results":detail.outcome==="detail"?"Improve listing contact experience":"Improve listing discovery";
    const yes=value=>value===true?"yes":"no";
    const lines=detail.outcome==="detail"
      ? ["Listing contact feedback (optional, private)",
         "Outcome: Needed more information before contacting a seller",
         "Category: "+category,
         "",
         "What would help me contact the seller: "]
      : ["Marketplace search feedback (optional, private)",
         "Outcome: "+(detail.outcome==="empty"?(detail.hasFilters===false?"No listings available yet":"No matching listings"):"Listings shown, but not the right item"),
         "Category: "+category,
         "Used text search: "+(detail.hasText===true?"yes":"no"),
         "Used game filter: "+(detail.hasGame===true?"yes":"no"),
         "Used price filter: "+(detail.hasPrice===true?"yes":"no"),
         "Used other category filters: "+(detail.hasExtra===true?"yes":"no"),
         "",
         "What I hoped to find: "];
    el("supportDescription").value=lines.join("\n");
    // A generated template can be replaced by another explicit search-feedback
    // action until the collector edits it. Typed content is never overwritten.
    captureFeedbackDraft(true);
    status("supportCreateStatus","Review and add your experience before sending. No search words, listing IDs or personal information were copied automatically.");
    el("supportDescription").focus();
  }
  document.addEventListener("deckplay:search-feedback", openSearchFeedback);
  // Opt-in listing-detail feedback; no passive exit tracking or listing/user identifiers.
  document.addEventListener("click", event => {
    const button=event.target.closest("[data-listing-discovery-feedback]");
    if(!button || !button.closest("#detailContent") || !document.getElementById("detailModal")?.classList.contains("open"))return;
    const category=button.dataset.listingDiscoveryFeedback;
    closeModal("detailModal");
    openSearchFeedback({detail:{outcome:"detail",category}});
  });

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
    setTradeConcernMode(true);
    el("supportDescription").focus();
    status("supportCreateStatus", "Describe the proposed trade or shipping issue. Do not include addresses or payment details.");
  }
  el("supportTradeConcern").addEventListener("click", openTradeConcern);
  // A moderation appeal is a private safety ticket, not an automatic reversal or
  // privileged action. Sign-in navigation stores only the intent, not draft data.
  function openModerationReview() {
    if (!currentUser?.id) { beginSupportSignIn("moderation"); return; }
    void show();
    el("supportCategory").value = "safety";
    el("supportSubject").value = "Request a moderation review";
    el("supportDescription").focus();
    status("supportCreateStatus", "Describe the restricted listing or decision and why it should be reviewed. Do not include sensitive account information.");
  }
  el("supportModerationReview").addEventListener("click", openModerationReview);
  function openListingReport(id) {
    if(!listingUuid.test(id || ""))return;
    if(!currentUser?.id) {
      pendingReportId = id; // Public listing UUID only; never retain a private draft.
      beginSupportSignIn("listing_report");
      return;
    }
    void show();
    setListingReportMode(id);
    el("supportDescription").focus();
    status("supportCreateStatus", "Explain what concerns you about this listing. A staff member reviews reports; this does not automatically remove the listing.");
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-report-listing]");
    if(!button || !button.closest("#detailContent"))return;
    if(document.getElementById("detailModal")?.classList.contains("open"))closeModal("detailModal");
    openListingReport(button.dataset.reportListing);
  });
  el("supportSignInButton").addEventListener("click", () => beginSupportSignIn("feedback"));
  // Cancelled sign-in must not unexpectedly reopen support after a later login.
  const authDialog = el("authModal");
  authDialog?.addEventListener("click", event => {
    if (event.target.closest('[data-close="authModal"]') || event.target === authDialog) { returnToFeedback = false; returnTopic = "feedback"; pendingReportId = null; }
  });
  authDialog?.addEventListener("keydown", event => {
    if (event.key === "Escape") { returnToFeedback = false; returnTopic = "feedback"; pendingReportId = null; }
  });
  el("supportClose").addEventListener("click",()=>closeModal(modal.id));
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal(modal.id)});
  async function show() {
    ++viewGeneration;
    userId = currentUser?.id || null;
    clearPrivate();
    // Ordinary support opens blank; the feedback action may restore only the
    // same account's tab-memory draft, never a previous collector's.
    if(feedbackDraft && feedbackDraft.owner!==userId)feedbackDraft=null;
    el("supportNewForm").reset();
    setTradeConcernMode(false);
    setFeedbackMode(false);
    setListingReportMode(null);
    el("supportPrivate").hidden = !userId;
    el("supportSignIn").hidden = !!userId;
    openModal(modal.id);
    if(!userId)return;
    // Ticket history is collector-owned and must not wait for the optional
    // staff/MFA role lookup. RLS and the owner_id filter still protect it.
    // Keep the role response tied to this account and modal visit, not the
    // read-generation counter that the independent list request advances.
    const v=viewGeneration,u=userId;
    void loadTickets();
    try{
      const {data,error}=await supabaseClient.rpc("is_deckplay_moderator");
      if(error)throw error;
      if(!validWrite(v,u))return;
      isStaff=data===true;
      el("supportStaff").hidden=!isStaff;
      el("supportStaffSafety").hidden=!isStaff;
      if(isStaff)void refreshStaffOverview();
    }catch(error){if(validWrite(v,u))console.warn("Staff support access unavailable",error)}
  }
  // This is a privileged, read-only count query. RLS and the existing MFA-aware
  // is_deckplay_moderator RPC both guard the staff overview. Never infer counts
  // from only the first ticket page, and never show invented numbers on failure.
  async function refreshStaffOverview(){
    if(!isStaff || !userId)return;
    const v=viewGeneration,u=userId;
    const current=()=>v===viewGeneration&&userId===u&&isStaff&&modal.classList.contains("open");
    const panel=el("supportStaffOverview");
    panel.hidden=false;
    // Feedback counts are independent; a failed diagnostic must not hide safety queue totals.
    void refreshFeedbackOverview();
    el("supportStaffOpenCount").textContent="—";
    el("supportStaffSafetyCount").textContent="—";
    status("supportStaffOverviewStatus","Loading live queue totals…");
    try{
      const [open,safety]=await Promise.all([
        supabaseClient.from("support_tickets").select("id",{count:"exact",head:true}).neq("status","resolved"),
        supabaseClient.from("support_tickets").select("id",{count:"exact",head:true}).eq("category","safety").neq("status","resolved")
      ]);
      if(!current())return;
      if(open.error||safety.error||!Number.isSafeInteger(open.count)||!Number.isSafeInteger(safety.count)||open.count<0||safety.count<0)throw Error("Queue totals unavailable");
      el("supportStaffOpenCount").textContent=String(open.count);
      el("supportStaffSafetyCount").textContent=String(safety.count);
      status("supportStaffOverviewStatus","Live counts updated. Use Staff queue or Safety queue to review requests.");
    }catch(error){
      if(!current())return;
      status("supportStaffOverviewStatus","Queue totals unavailable. Refresh to retry.");
    }
  }
  // Only aggregate voluntary feedback by its fixed, non-sensitive subject label.
  // Staff RLS and MFA-aware staff recognition still apply; no body/identity reads.
  async function refreshFeedbackOverview(){
    if(!isStaff||!userId)return;
    const v=viewGeneration,u=userId;
    const current=()=>v===viewGeneration&&userId===u&&isStaff&&modal.classList.contains("open");
    const ids=["supportFeedbackEmptyCount","supportFeedbackDiscoveryCount","supportFeedbackContactCount"];
    ids.forEach(id=>el(id).textContent="—");
    status("supportFeedbackOverviewStatus","Loading opt-in feedback counts…");
    try{
      const subjects=Object.values(feedbackQueueSubjects);
      const results=await Promise.all(subjects.map(subject=>supabaseClient.from("support_tickets")
        .select("id",{count:"exact",head:true}).eq("category","other").eq("subject",subject)));
      if(!current())return;
      if(results.some(result=>result.error||!Number.isSafeInteger(result.count)||result.count<0))throw Error("Feedback totals unavailable");
      results.forEach((result,index)=>{el(ids[index]).textContent=String(result.count)});
      status("supportFeedbackOverviewStatus","Counts include only voluntarily submitted reports.");
    }catch(error){
      if(!current())return;
      ids.forEach(id=>el(id).textContent="—");
      status("supportFeedbackOverviewStatus","Feedback counts unavailable. Refresh to retry.");
    }
  }
  // Load older tickets in 40-row pages. The extra row detects whether another
  // page exists; all filters run on the server before pagination.
  async function loadTickets(append = false) {
    if (!userId || (append && (loadingTickets || !moreTickets))) return;
    const request = ++ticketListRequest, v = ++generation, u = userId;
    const offset = append ? ticketOffset : 0;
    const loadMore = el("supportLoadMore");
    loadingTickets = true;
    el("supportStaffSortWrap").hidden = !(staffView && isStaff);
    loadMore.disabled = true;
    if (!append) {
      moreTickets = false;
      loadMore.hidden = true;
      el("supportTicketList").replaceChildren();
    }
    status("supportListStatus", append ? "Loading older tickets…" : "Loading private tickets…");
    try {
      let query = supabaseClient.from("support_tickets")
        .select("id,owner_id,category,subject,body,status,created_at,updated_at")
        .order("updated_at",{ascending: staffView && isStaff && staffSort === "oldest"})
        .order("id",{ascending: staffView && isStaff && staffSort === "oldest"})
        .range(offset, offset + 40);
      if (!staffView) query = query.eq("owner_id",u);
      if (staffView && isStaff && staffSafetyOnly) query = query.eq("category","safety");
      if (ticketFilter === "active") query = query.neq("status","resolved");
      if (ticketFilter === "resolved") query = query.eq("status","resolved");
      // Filter on the server before the 40-row page; never silently omit older matches.
      if (ticketCategory !== "all") query = query.eq("category",ticketCategory);
      // Staff-only drill-down: a fixed subject filter runs before pagination.
      if (staffView && isStaff && feedbackQueueSubject) query = query.eq("subject",feedbackQueueSubject);
      const {data,error} = await query;
      if (error) throw error;
      if (!valid(v,u) || request !== ticketListRequest) return;
      const rows = data || [];
      const page = rows.slice(0,40);
      moreTickets = rows.length > 40;
      ticketOffset = offset + page.length;
      if (!append) tickets = [];
      const known = new Set(tickets.map(ticket => ticket.id));
      for (const ticket of page) {
        if (known.has(ticket.id)) continue;
        known.add(ticket.id);
        tickets.push(ticket);
        const button = document.createElement("button");
        button.type = "button"; button.className = "ghost";
        button.style.cssText = "display:block;width:100%;text-align:left;margin:6px 0;white-space:normal;overflow-wrap:anywhere";
        button.textContent = ticket.subject + " — " + (labels[ticket.status] || ticket.status) + " · " + date(ticket.updated_at);
        button.addEventListener("click", () => showTicket(ticket.id));
        el("supportTicketList").append(button);
      }
      loadMore.hidden = !moreTickets;
      status("supportListStatus", tickets.length ? "Showing " + tickets.length + (staffSafetyOnly && staffView ? " safety reports or appeals." : " tickets. Select one to view private replies.") :
        ticketCategory !== "all" ? "No " + el("supportTicketCategory").selectedOptions[0].textContent.toLowerCase() + " tickets in this view." :
        ticketFilter === "active" ? "No open tickets in this view." :
        ticketFilter === "resolved" ? "No resolved tickets in this view." : "No tickets in this view.");
      if (!append) {
        if (selected && tickets.some(ticket => ticket.id === selected)) await showTicket(selected);
        else { selected = null; el("supportTicketDetail").hidden = true; }
      }
    } catch (error) {
      if (valid(v,u) && request === ticketListRequest) {
        if (append) {
          loadMore.hidden = false;
          status("supportListStatus", "Could not load older tickets. Retry.");
        } else status("supportListStatus", "Tickets could not load. Refresh to retry.");
      }
    } finally {
      if (request === ticketListRequest) {
        loadingTickets = false;
        loadMore.disabled = false;
      }
    }
  }
  el("supportLoadMore").addEventListener("click", () => { void loadTickets(true); });
  async function showTicket(id){
    const ticket=tickets.find(t=>t.id===id);
    if(!ticket)return;
    // A pending reply belongs to its original ticket. Switching tickets must
    // unlock the new composer without allowing the old response to unlock it.
    if(selected!==id){
      ++replySubmitRequest;
      el("supportReplyForm").querySelector('button[type="submit"]').disabled=false;
      ++statusSubmitRequest;
      el("supportSetStatus").disabled=false;
    }
    selected=id;
    el("supportReplyBody").value=replyDrafts.get(id)||"";
    updateReplyCount();
    const v=++generation,u=userId;
    el("supportTicketDetail").hidden=false;
    el("supportTicketTitle").textContent=ticket.subject;
    el("supportTicketBody").textContent=ticket.body;
    el("supportTicketState").textContent=(labels[ticket.status]||ticket.status)+" · "+date(ticket.created_at);
    el("supportTicketNextStep").textContent=nextSteps[ticket.status]||"Check this ticket for status updates.";
    el("supportReplyForm").hidden=ticket.status==="resolved";
    el("supportStaffControls").hidden=!isStaff;
    el("supportStatusSelect").value=ticket.status;
    ++replyRequest; replyOffset = 0; moreReplies = false; loadingReplies = false;
    el("supportRepliesLoadMore").hidden = true;
    el("supportRepliesLoadMore").disabled = false;
    el("supportReplies").textContent="Loading replies…";
    status("supportRepliesStatus","");
    status("supportReplyStatus","");
    await loadReplies(id, false, viewGeneration, u);

  }
  // Newest replies are loaded first so a long conversation never hides recent
  // support responses behind the first 100 messages. Earlier pages prepend in
  // chronological order without mixing tickets or accounts.
  async function loadReplies(id, append, v, u) {
    if (append && (loadingReplies || !moreReplies)) return;
    const request = ++replyRequest;
    const offset = append ? replyOffset : 0;
    const button = el("supportRepliesLoadMore");
    loadingReplies = true;
    button.disabled = true;
    status("supportRepliesStatus", append ? "Loading earlier replies…" : "");
    try {
      const {data,error}=await supabaseClient.from("support_ticket_replies")
        .select("id,author_id,is_staff,body,created_at")
        .eq("ticket_id",id).order("created_at",{ascending:false}).order("id",{ascending:false})
        .range(offset,offset+40);
      if(error)throw error;
      if(!validWrite(v,u)||selected!==id||request!==replyRequest)return;
      const rows=data||[];
      const page=rows.slice(0,40);
      replyOffset=offset+page.length;
      moreReplies=rows.length>40;
      const fragment=document.createDocumentFragment();
      for(const reply of page.reverse()){
        const article=document.createElement("article");
        article.style.cssText="border:1px solid #cbd6e5;border-radius:10px;padding:10px;margin:8px 0;overflow-wrap:anywhere";
        const header=document.createElement("strong");
        header.textContent=(reply.is_staff?"Support":reply.author_id===u?"You":"Collector")+" · "+date(reply.created_at);
        const body=document.createElement("p");
        body.style.whiteSpace="pre-wrap";
        body.textContent=reply.body;
        article.append(header,body);
        fragment.append(article);
      }
      if(append)el("supportReplies").prepend(fragment);
      else {
        el("supportReplies").replaceChildren(fragment);
        if(!page.length)el("supportReplies").textContent="No replies yet.";
      }
      button.hidden=!moreReplies;
      status("supportRepliesStatus",moreReplies?"Showing "+replyOffset+" most recent replies. Load earlier replies for more.":"");
    }catch(error){
      if(validWrite(v,u)&&selected===id&&request===replyRequest){
        if(!append)el("supportReplies").textContent="Replies could not load. Reopen this ticket to retry.";
        else button.hidden=false;
        status("supportRepliesStatus",append?"Could not load earlier replies. Retry.":"");
      }
    }finally{
      if(request===replyRequest){loadingReplies=false;button.disabled=false;}
    }
  }
  el("supportRepliesLoadMore").addEventListener("click",()=>{
    if(selected&&userId)void loadReplies(selected,true,viewGeneration,userId);
  });
  modal.querySelectorAll("[data-support-filter]").forEach(button => button.addEventListener("click", () => {
    const next = button.dataset.supportFilter;
    if(!["all","active","resolved"].includes(next) || next===ticketFilter) return;
    ticketFilter = next;
    modal.querySelectorAll("[data-support-filter]").forEach(item => item.setAttribute("aria-pressed", String(item===button)));
    selected=null;
    el("supportTicketDetail").hidden=true;
    ++replyRequest;
    el("supportReplies").replaceChildren();
    el("supportRepliesLoadMore").hidden=true;
    void loadTickets();
  }));
  function clearFeedbackQueue(){
    feedbackQueueSubject=null;
    el("supportFeedbackQueueNotice").hidden=true;
    el("supportFeedbackQueueLabel").textContent="";
  }
  modal.querySelectorAll("[data-feedback-queue]").forEach(button=>button.addEventListener("click",()=>{
    if(!isStaff||!userId)return;
    const key=button.dataset.feedbackQueue,subject=feedbackQueueSubjects[key];
    if(!subject)return;
    staffView=true;staffSafetyOnly=false;feedbackQueueSubject=subject;
    resetTicketCategory("other",true);
    el("supportStaffSafety").setAttribute("aria-pressed","false");
    ticketFilter="all";
    modal.querySelectorAll("[data-support-filter]").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.supportFilter==="all")));
    el("supportFeedbackQueueLabel").textContent="Reviewing "+feedbackQueueLabels[key]+" (voluntary reports only).";
    el("supportFeedbackQueueNotice").hidden=false;
    selected=null;el("supportTicketDetail").hidden=true;
    ++replyRequest;el("supportReplies").replaceChildren();el("supportRepliesLoadMore").hidden=true;
    void loadTickets();
  }));
  el("supportFeedbackQueueClear").addEventListener("click",()=>{
    if(!isStaff||!userId)return;
    clearFeedbackQueue();resetTicketCategory();
    selected=null;el("supportTicketDetail").hidden=true;
    ++replyRequest;el("supportReplies").replaceChildren();el("supportRepliesLoadMore").hidden=true;
    void loadTickets();
  });
  el("supportTicketCategory").addEventListener("change",()=>{
    const next=el("supportTicketCategory").value;
    if(!["all","account","listing","messages","offers_trades","safety","other"].includes(next) || el("supportTicketCategory").disabled)return;
    clearFeedbackQueue();ticketCategory=next;selected=null;el("supportTicketDetail").hidden=true;
    ++replyRequest;el("supportReplies").replaceChildren();el("supportRepliesLoadMore").hidden=true;
    void loadTickets();
  });
  function resetTicketCategory(next="all",locked=false){
    ticketCategory=next;el("supportTicketCategory").value=next;el("supportTicketCategory").disabled=locked;
  }
  el("supportStaffSort").addEventListener("change",()=>{
    if(!isStaff || !staffView){el("supportStaffSort").value="newest";return;}
    staffSort=el("supportStaffSort").value==="oldest"?"oldest":"newest";
    ticketOffset=0;moreTickets=false;selected=null;el("supportTicketDetail").hidden=true;
    void loadTickets();
  });
  el("supportMine").addEventListener("click",()=>{clearFeedbackQueue();staffView=false;staffSafetyOnly=false;el("supportStaffSortWrap").hidden=true;resetTicketCategory();el("supportStaffSafety").setAttribute("aria-pressed","false");selected=null;el("supportTicketDetail").hidden=true;loadTickets()});
  el("supportStaff").addEventListener("click",()=>{clearFeedbackQueue();if(!isStaff)return;staffView=true;staffSafetyOnly=false;resetTicketCategory();el("supportStaffSafety").setAttribute("aria-pressed","false");selected=null;el("supportTicketDetail").hidden=true;loadTickets()});
  el("supportStaffSafety").addEventListener("click",()=>{clearFeedbackQueue();if(!isStaff)return;staffView=true;staffSafetyOnly=true;resetTicketCategory("safety",true);el("supportStaffSafety").setAttribute("aria-pressed","true");selected=null;el("supportTicketDetail").hidden=true;loadTickets()});
  el("supportRefresh").addEventListener("click", () => { void loadTickets(); if(isStaff)void refreshStaffOverview(); });
  el("supportNewForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!userId)return;
    const form=e.currentTarget,button=form.querySelector('button[type="submit"]');
    if(button.disabled)return;
    const v=viewGeneration,u=userId;
    const rawSubject=el("supportSubject").value.trim();
    const tradeKind=tradeConcernMode?(tradeConcerns[el("supportTradeConcernKind").value]||tradeConcerns.proposal):null;
    const prefix=feedbackMode?(feedbackKinds[el("supportFeedbackKind").value]||feedbackKinds.other).prefix:tradeKind?.prefix||"";
    const subject=prefix+rawSubject;
    const reportId=listingReportId,reportReason=el("supportReportReason").value;
    if(reportId && (!listingUuid.test(reportId) || !reportReasons[reportReason])){
      status("supportCreateStatus","Choose a valid listing and report reason.");return;
    }
    const areaKey=el("supportFeedbackArea").value;
    const area=Object.prototype.hasOwnProperty.call(feedbackAreas,areaKey)?feedbackAreas[areaKey]:feedbackAreas.general;
    const body=reportId
      ? "Listing ID: "+reportId+"\nReason: "+reportReasons[reportReason]+"\nDetails: "+el("supportDescription").value.trim()
      : tradeKind?"Concern: "+el("supportTradeConcernKind").selectedOptions[0].textContent+"\nDetails: "+el("supportDescription").value.trim()
      : feedbackMode?"Area: "+area+"\nDetails: "+el("supportDescription").value.trim()
      : el("supportDescription").value.trim();
    if(rawSubject.length<8||subject.length>120){
      status("supportCreateStatus","Enter a subject of at least 8 characters that fits the limit.");
      return;
    }
    if(body.length>3000){
      status("supportCreateStatus","This ticket is too long once the report details are included. Shorten the description and retry; your draft is saved here.");
      el("supportDescription").focus();
      return;
    }
    if(feedbackMode && feedbackTemplateNeedsAnswer(el("supportDescription").value)){
      status("supportCreateStatus","Add what you hoped to find or what would help you contact the seller before sending.");
      el("supportDescription").focus();
      return;
    }
    // Keep edits made while the request is in flight. A successful older draft
    // must not silently erase a newer beta-feedback or support draft.
    const draftState=()=>[el("supportSubject").value,el("supportDescription").value,
      el("supportCategory").value,el("supportFeedbackKind").value,el("supportFeedbackArea").value,
      el("supportTradeConcernKind").value,el("supportReportReason").value,
      feedbackMode,tradeConcernMode,listingReportId];
    const sentDraft=JSON.stringify(draftState()),request=++createRequest;
    if(feedbackMode)captureFeedbackDraft();
    button.disabled=true;status("supportCreateStatus","Submitting…");
    try{
      const {data,error}=await supabaseClient.rpc("create_support_ticket",{
        p_category:reportId?"safety":feedbackMode?"other":tradeKind?tradeKind.category:el("supportCategory").value,p_subject:subject,
        p_body:body
      });
      if(error)throw error;
      if(!validWrite(v,u))return;
      const newerDraft=JSON.stringify(draftState())!==sentDraft;
      if(!newerDraft){
        if(feedbackMode){feedbackDraft=null;el("supportFeedbackDiscard").hidden=true;}
        form.reset();setTradeConcernMode(false);setListingReportMode(null);updateFeedbackKind();
      }
      // A successful new ticket must be visible in My tickets even when the
      // collector was browsing a different topic or staff-only drill-down.
      // Keep form category/unsent edits intact; only reset the history view.
      staffView=false;staffSafetyOnly=false;
      clearFeedbackQueue();resetTicketCategory();
      el("supportStaffSafety").setAttribute("aria-pressed","false");
      selected=data;
      // A new open ticket must be visible even if the collector was filtering resolved history.
      ticketFilter="all";
      modal.querySelectorAll("[data-support-filter]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.supportFilter === "all")));
      status("supportCreateStatus",newerDraft?"Ticket created. Your newer draft is preserved.":"Ticket created. You can follow replies below.");
      await loadTickets();
    }catch(error){if(validWrite(v,u))status("supportCreateStatus",error.message||"Could not create ticket. Try again.")}
    finally{if(request===createRequest)button.disabled=false}
  });
  const updateReplyCount = () => {
    el("supportReplyCount").textContent = el("supportReplyBody").value.length + " / 3000 characters";
  };
  updateReplyCount();
  el("supportReplyBody").addEventListener("input",event=>{
    updateReplyCount();
    if(selected && userId) replyDrafts.set(selected,event.target.value);
  });
  el("supportReplyForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!selected||!userId)return;
    const form=e.currentTarget,button=form.querySelector('button[type="submit"]');
    if(button.disabled)return;
    const id=selected,u=userId,v=viewGeneration,request=++replySubmitRequest;
    // Snapshot the submitted text. Collectors may keep typing while the RPC is in flight.
    // Never erase a newer draft just because an older version was accepted.
    const submittedRaw=el("supportReplyBody").value;
    const submittedBody=submittedRaw.trim();
    if(submittedBody.length>3000){
      status("supportReplyStatus","Reply is too long. Shorten it to 3000 characters; your draft is preserved.");
      el("supportReplyBody").focus();
      return;
    }
    if(submittedBody.length<2){
      status("supportReplyStatus","Write at least two characters before sending a reply. Your draft is preserved.");
      el("supportReplyBody").focus();
      return;
    }
    button.disabled=true;status("supportReplyStatus","Sending…");
    try{
      const {error}=await supabaseClient.rpc("reply_support_ticket",{p_ticket_id:id,p_body:submittedBody});
      if(error)throw error;
      if(!validWrite(v,u))return;
      if(replyDrafts.get(id)===submittedRaw)replyDrafts.delete(id);
      if(selected!==id)return; // Never erase or overwrite the other ticket's draft.
      if(el("supportReplyBody").value===submittedRaw){el("supportReplyBody").value="";updateReplyCount();}
      const newerDraftSaved=replyDrafts.has(id);
      await loadTickets(); // Refresh reopens the ticket and clears the previous status line.
      if(validWrite(v,u)&&selected===id)status("supportReplyStatus",newerDraftSaved?"Reply sent. Your newer draft is saved.":"Reply sent.");
    }catch(error){if(validWrite(v,u)&&selected===id)status("supportReplyStatus",error.message||"Reply failed. Your text is preserved.")}
    finally{if(request===replySubmitRequest)button.disabled=false}
  });
  el("supportSetStatus").addEventListener("click",async e=>{
    if(!isStaff||!selected||!userId)return;
    const button=e.currentTarget,id=selected,u=userId,v=viewGeneration;
    if(button.disabled)return;
    const request=++statusSubmitRequest, nextStatus=el("supportStatusSelect").value;
    // Status updates are tied to the original ticket and account, not the
    // shared button. A delayed response must not unlock another pending save.
    button.disabled=true;
    status("supportReplyStatus","Saving ticket status…");
    try{
      const {error}=await supabaseClient.rpc("set_support_ticket_status",{p_ticket_id:id,p_status:nextStatus});
      if(error)throw error;
      if(validWrite(v,u)&&selected===id&&request===statusSubmitRequest){
        await loadTickets();
        if(validWrite(v,u)&&selected===id&&request===statusSubmitRequest){
          status("supportReplyStatus","Ticket status updated.");
          if(isStaff)void refreshStaffOverview();
        }
      }
    }catch(error){
      if(validWrite(v,u)&&selected===id&&request===statusSubmitRequest)
        status("supportReplyStatus",error.message||"Could not update ticket status.");
    }finally{
      if(request===statusSubmitRequest)button.disabled=false;
    }
  });
  supabaseClient.auth.onAuthStateChange((_event,session)=>{
    const next=session?.user?.id||null;
    if(next===userId)return;
    userId=next;++generation;++viewGeneration;feedbackDraft=null;clearPrivate();
    el("supportFeedbackDiscard").hidden=true;
    el("supportNewForm").reset(); // Never carry a private draft into another account.
    setTradeConcernMode(false);
    listingReportId=null;
    el("supportListingReportFields").hidden=true;
    if(modal.classList.contains("open"))closeModal(modal.id);
    if(next && returnToFeedback){
      returnToFeedback=false;
      const topic = returnTopic;
      const reportId = pendingReportId;
      pendingReportId=null;
      returnTopic = "feedback";
      // Let the application's own auth listener finish updating currentUser first.
      setTimeout(()=>{
        if(currentUser?.id===next) {
          if(topic==="trade")openTradeConcern();
          else if(topic==="moderation")openModerationReview();
          else if(topic==="listing_report" && reportId)openListingReport(reportId);
          else openFeedback();
        }
      },0);
    }
  });
})();
