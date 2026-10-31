/* T5.5 — PWA update notice. No cached user content, hidden reloads, or automatic draft loss. */
(() => {
  if (!('serviceWorker' in navigator)) return;
  const worker = navigator.serviceWorker;
  if (!worker || typeof worker.register !== 'function') return;
  const CHECK_INTERVAL_MS = 10 * 60 * 1000;
  let registration = null;
  let lastCheck = Date.now();
  let hasController = Boolean(worker.controller);
  let notice = null;

  function removeNotice() {
    if (notice) notice.remove();
    notice = null;
  }

  // A fixed update prompt can cover the mobile keyboard and the active field.
  // Keep the notice pending, but defer displaying it while somebody is typing.
  function editingOnSmallScreen() {
    if (window.innerWidth > 700) return false;
    const field = document.activeElement;
    return Boolean(field && (field.isContentEditable || field.matches?.(
      'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([type=reset]):not([readonly]),textarea:not([readonly]),select'
    )));
  }
  function syncNoticeVisibility() {
    if (notice) notice.style.display = editingOnSmallScreen() ? 'none' : 'flex';
  }

  function showUpdateNotice() {
    if (notice || !document.body) return;
    const panel = document.createElement('section');
    panel.id = 'deckplayAppUpdate';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-label', 'New DeckPlay version available');
    panel.style.cssText = 'position:fixed;z-index:9998;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));margin:auto;max-width:530px;border:1px solid #adc4df;border-radius:14px;background:#14213d;color:#fff;box-shadow:0 8px 26px #0005;padding:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px';
    const message = document.createElement('span');
    message.textContent = 'DeckPlay has an update ready. Refresh when you have saved your work.';
    message.style.cssText = 'flex:1 1 180px;line-height:1.4;font-size:14px';
    const controls = document.createElement('span');
    controls.style.cssText = 'display:flex;gap:8px;align-items:center';
    const later = document.createElement('button');
    later.type = 'button';
    later.textContent = 'Later';
    later.setAttribute('aria-label', 'Dismiss app update notification');
    later.style.cssText = 'background:transparent;color:#fff;border:1px solid #9aaecb;border-radius:8px;padding:10px 12px;min-height:44px';
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'Refresh';
    refresh.setAttribute('aria-label', 'Refresh DeckPlay to load new version');
    refresh.style.cssText = 'background:#e8c778;color:#14213d;border:0;border-radius:8px;padding:10px 15px;font-weight:700;min-height:44px';
    later.addEventListener('click', removeNotice);
    refresh.addEventListener('click', () => {
      // Keep the existing page and unsaved work visible while offline. A
      // service-worker fallback page cannot restore a draft after a reload.
      if (navigator.onLine === false) {
        message.textContent = 'You are offline. Reconnect before refreshing so unfinished work is not lost.';
        return;
      }
      // An unsent photo cannot be recovered from a refreshed browser page.
      // The user chooses when to reload; no automatic reload on controller change.
      if (!window.confirm('Refresh DeckPlay now? Save any unfinished listing, message or photo first.')) return;
      window.location.reload();
    });
    controls.append(later, refresh);
    panel.append(message, controls);
    document.body.append(panel);
    notice = panel;
    syncNoticeVisibility();
  }

  worker.addEventListener('controllerchange', () => {
    // The very first installation is not an app update.
    if (!hasController) { hasController = true; return; }
    showUpdateNotice();
  });

  async function checkForUpdate() {
    if (!registration || document.hidden || navigator.onLine === false) return;
    const now = Date.now();
    if (now - lastCheck < CHECK_INTERVAL_MS) return;
    lastCheck = now;
    try { await registration.update(); } catch (error) {
      console.warn('Could not check for an app update:', error);
    }
  }

  async function start() {
    try {
      registration = await worker.register('/sw.js', { updateViaCache: 'none' });
      // An update may finish installing without changing the active controller.
      // Offer an explicit refresh when the browser has a waiting replacement.
      function watchInstallingWorker() {
        const installing = registration.installing;
        if (!installing) return;
        const ready = () => {
          if (installing.state === 'installed' && hasController && registration.waiting) showUpdateNotice();
        };
        installing.addEventListener?.('statechange', ready);
        ready(); // Installing may have completed before the listener attached.
      }
      registration.addEventListener?.('updatefound', watchInstallingWorker);
      watchInstallingWorker(); // Registration may already be installing on page load.
      // Browser may already have a new worker waiting when this tab resumes.
      if (hasController && registration.waiting) showUpdateNotice();
      lastCheck = Date.now();
    } catch (error) {
      console.warn('App installation worker unavailable:', error);
    }
  }

  document.addEventListener('focusin', syncNoticeVisibility);
  document.addEventListener('focusout', () => queueMicrotask(syncNoticeVisibility));
  window.addEventListener('resize', syncNoticeVisibility);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkForUpdate(); });
  window.addEventListener('pageshow', () => { void checkForUpdate(); });
  if (document.readyState === 'complete') void start();
  else window.addEventListener('load', () => { void start(); }, { once: true });
})();
