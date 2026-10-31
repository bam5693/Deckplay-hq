const { test, expect } = require('@playwright/test');

async function mockWorker(page, { controlled = false, waiting = false } = {}) {
  await page.addInitScript(({ controlled, waiting }) => {
    const fake = new EventTarget();
    fake.controller = controlled ? { version: 'existing' } : null;
    const registration = Object.assign(new EventTarget(), {
      waiting: waiting ? { state: 'installed' } : null,
      updates: 0,
      async update() { this.updates += 1; }
    });
    fake.register = async (path, options) => {
      window.__pwaRegistrationArgs = { path, options };
      return registration;
    };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: fake });
    window.__pwaFakeWorker = fake;
    window.__pwaFakeRegistration = registration;
  }, { controlled, waiting });
}

test('first PWA install stays quiet; later controller replacement offers Refresh or Later', async ({ page }) => {
  await mockWorker(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__pwaRegistrationArgs));
  expect(await page.evaluate(() => window.__pwaRegistrationArgs)).toEqual({
    path: '/sw.js', options: { updateViaCache: 'none' }
  });
  await page.evaluate(() => {
    __pwaFakeWorker.controller = { version: 'initial' };
    __pwaFakeWorker.dispatchEvent(new Event('controllerchange'));
  });
  await expect(page.locator('#deckplayAppUpdate')).toHaveCount(0);
  await page.evaluate(() => {
    __pwaFakeWorker.controller = { version: 'updated' };
    __pwaFakeWorker.dispatchEvent(new Event('controllerchange'));
  });
  await expect(page.locator('#deckplayAppUpdate')).toContainText('Refresh when you have saved your work');
  await expect(page.locator('#deckplayAppUpdate [aria-label="Refresh DeckPlay to load new version"]')).toBeVisible();
  await page.locator('#deckplayAppUpdate button:has-text("Later")').click();
  await expect(page.locator('#deckplayAppUpdate')).toHaveCount(0);
  await expect(page.locator('#search')).toBeVisible();
});

test('existing PWA with waiting update shows prompt and never reloads without user consent', async ({ page }) => {
  await mockWorker(page, { controlled: true, waiting: true });
  await page.goto('/');
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
  await page.locator('#search').fill('unsaved collector search');
  // On mobile the update prompt defers while typing; leave the field to reopen it.
  await page.locator('#search').blur();
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#deckplayAppUpdate button:has-text("Refresh")').click();
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
  await expect(page.locator('#search')).toHaveValue('unsaved collector search');
});

test('offline refresh leaves unsent work on screen instead of opening the PWA offline fallback', async ({ page }) => {
  await mockWorker(page, { controlled: true, waiting: true });
  await page.goto('/');
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
  await page.locator('#search').fill('unfinished seller search');
  // Keep the offline draft, then restore the update controls after focus leaves.
  await page.locator('#search').blur();
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  });
  let confirmations = 0;
  page.on('dialog', async dialog => { confirmations++; await dialog.dismiss(); });
  const initialUrl = page.url();
  await page.locator('#deckplayAppUpdate button:has-text("Refresh")').click();
  await expect(page.locator('#deckplayAppUpdate')).toContainText('You are offline. Reconnect before refreshing');
  await expect(page.locator('#search')).toHaveValue('unfinished seller search');
  expect(page.url()).toBe(initialUrl);
  expect(confirmations).toBe(0);
});

test('foreground-only update checks are throttled and do not run while offline', async ({ page }) => {
  await mockWorker(page, { controlled: true });
  await page.addInitScript(() => {
    window.__pwaNow = 1000;
    Date.now = () => window.__pwaNow;
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => window.__pwaOnline !== false });
  });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__pwaRegistrationArgs));
  await page.evaluate(() => {
    window.__pwaNow += 11 * 60 * 1000;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => __pwaFakeRegistration.updates)).toBe(1);
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.__pwaOnline = false;
    window.__pwaNow += 11 * 60 * 1000;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => __pwaFakeRegistration.updates)).toBe(1);
  await page.evaluate(() => {
    window.__pwaOnline = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => __pwaFakeRegistration.updates)).toBe(2);
});

test('mobile PWA update prompt defers during editing and restores after blur', async ({ page }, testInfo) => {
  await mockWorker(page, { controlled: true, waiting: true });
  await page.goto('/');
  const prompt = page.locator('#deckplayAppUpdate');
  const search = page.locator('#search');
  await expect(prompt).toBeVisible();
  await search.focus();
  if (testInfo.project.name === 'local-mobile') {
    await expect(prompt).toBeHidden();
  } else {
    await expect(prompt).toBeVisible();
  }
  await search.fill('unsent collection search');
  await expect(search).toHaveValue('unsent collection search');
  await search.blur();
  await expect(prompt).toBeVisible();
  await expect(search).toHaveValue('unsent collection search');
});

test('PWA refresh and dismiss controls have mobile-sized tap targets', async ({ page }) => {
  await mockWorker(page, { controlled: true, waiting: true });
  await page.goto('/');
  const prompt = page.locator('#deckplayAppUpdate');
  await expect(prompt).toBeVisible();
  for (const label of ['Dismiss app update notification', 'Refresh DeckPlay to load new version']) {
    const button = prompt.getByRole('button', { name: label });
    const dimensions = await button.evaluate(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width }));
    expect(dimensions.height, label + ' must be easy to tap').toBeGreaterThanOrEqual(44);
    expect(dimensions.width, label + ' must be easy to tap').toBeGreaterThanOrEqual(44);
  }
});

test('a newly installed waiting PWA update prompts an already-open tab', async ({ page }) => {
  await mockWorker(page, { controlled: true });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__pwaRegistrationArgs));
  await page.evaluate(() => {
    const registration = window.__pwaFakeRegistration;
    const installer = new EventTarget();
    installer.state = 'installing';
    registration.installing = installer;
    registration.dispatchEvent(new Event('updatefound'));
    installer.state = 'installed';
    registration.waiting = installer;
    installer.dispatchEvent(new Event('statechange'));
  });
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
});

test('a PWA already installing at registration is tracked until it can prompt', async ({ page }) => {
  await page.addInitScript(() => {
    const fake = new EventTarget();
    fake.controller = { version: 'existing' };
    const installer = new EventTarget();
    installer.state = 'installing';
    const registration = Object.assign(new EventTarget(), { installing: installer, waiting: null, update: async () => {} });
    fake.register = async () => registration;
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: fake });
    window.__alreadyInstalling = { registration, installer };
  });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__alreadyInstalling));
  await page.evaluate(() => {
    __alreadyInstalling.installer.state = 'installed';
    __alreadyInstalling.registration.waiting = __alreadyInstalling.installer;
    __alreadyInstalling.installer.dispatchEvent(new Event('statechange'));
  });
  await expect(page.locator('#deckplayAppUpdate')).toBeVisible();
});
