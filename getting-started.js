/* T7.4: first-time buyer/seller guide; read-only, no analytics or account data. */
(() => {
  const guide = document.getElementById("gettingStarted");
  if (!guide) return;
  const tabs = [...guide.querySelectorAll("[data-guide-tab]")];
  const panels = {buyer:document.getElementById("guideBuyer"), seller:document.getElementById("guideSeller")};
  function selectGuide(role) {
    if (!Object.prototype.hasOwnProperty.call(panels, role)) return;
    for (const tab of tabs) {
      const selected = tab.dataset.guideTab === role;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const [name, panel] of Object.entries(panels)) panel.hidden = name !== role;
  }
  // Navigate from a hidden guide without leaving keyboard focus behind.
  // Programmatically focusable headings are not added to the normal Tab order.
  function focusDestination(element) {
    if (!element) return;
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
    element.focus({preventScroll:true});
  }
  function scrollToDestination(element) {
    if (!element) return;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({behavior:reduceMotion ? "auto" : "smooth", block:"start"});
  }
  guide.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest("[data-guide-tab]");
    if (tab && guide.contains(tab)) { selectGuide(tab.dataset.guideTab); return; }
    const action = event.target.closest("[data-guide-action]");
    if (!action || !guide.contains(action)) return;
    if (action.dataset.guideAction === "sell") { openSell(); return; }
    if (action.dataset.guideAction === "browse") {
      showMainMarketplace();
      const market = document.getElementById("market");
      scrollToDestination(market);
      focusDestination(market?.querySelector("h2") || market);
    }
  });
  guide.addEventListener("keydown", event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest("[data-guide-tab]");
    if (!tab || !guide.contains(tab) || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
      (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selectGuide(tabs[next].dataset.guideTab);
    tabs[next].focus();
  });
  const feedback = document.createElement("button");
  feedback.type = "button";
  feedback.className = "ghost";
  feedback.textContent = "Share beta feedback";
  feedback.setAttribute("aria-label", "Share private beta feedback with DeckPlay support");
  feedback.addEventListener("click", () => {
    document.dispatchEvent(new Event("deckplay:open-feedback"));
  });
  guide.append(feedback);
  const footer = document.querySelector("footer");
  if (footer) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = "Getting started";
    button.setAttribute("aria-label", "Getting started: buyer and seller guide");
    button.addEventListener("click", () => {
      showHomePage();
      requestAnimationFrame(() => {
        // A fast navigation away should not steal focus from the new screen.
        if (!guide.getClientRects().length) return;
        scrollToDestination(guide);
        focusDestination(document.getElementById("guideTitle") || guide);
      });
    });
    footer.append(button);
    // Feedback stays reachable from Marketplace, Inbox and Profile, not just Home.
    const feedbackFooter = document.createElement("button");
    feedbackFooter.type = "button";
    feedbackFooter.className = "ghost";
    feedbackFooter.textContent = "Beta feedback";
    feedbackFooter.setAttribute("aria-label", "Open private beta feedback");
    feedbackFooter.addEventListener("click", () => {
      document.dispatchEvent(new Event("deckplay:open-feedback"));
    });
    footer.append(feedbackFooter);
  }
  // Keep the guide usable if markup changes or one panel is unavailable.
  if (panels.buyer && panels.seller && tabs.length) selectGuide("buyer");
})();
