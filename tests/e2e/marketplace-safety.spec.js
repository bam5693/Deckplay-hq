const { test, expect } = require('@playwright/test');

// These tests never submit forms or change real marketplace data.
test('trade proposal keeps payments disabled and validates cash limits', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.getElementById('tradeComposeModal').classList.add('open'));
  await expect(page.locator('#tradeComposeForm')).toBeVisible();
  await expect(page.locator('#tradeComposeModal')).toContainText('does not collect or transfer payments');
  const cash = page.locator('#tradeCashAmount');
  await expect(cash).toBeDisabled();
  await page.locator('#tradeCashDirection').selectOption('sender_pays');
  await expect(cash).toBeEnabled();
  await cash.fill('-1');
  expect(await cash.evaluate(el => el.checkValidity())).toBe(false);
  await cash.fill('100001');
  expect(await cash.evaluate(el => el.checkValidity())).toBe(false);
  await cash.fill('12.50');
  expect(await cash.evaluate(el => el.checkValidity())).toBe(true);
});

test('listing requires a name and offers photo upload controls without publishing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.getElementById('sellModal').classList.add('open'));
  const item = page.locator('#item');
  await expect(item).toBeVisible();
  expect(await item.evaluate(el => el.checkValidity())).toBe(false);
  await item.fill('Automated test card - not published');
  expect(await item.evaluate(el => el.checkValidity())).toBe(true);
  await expect(page.locator('#listingAddPhotos')).toBeVisible();
  await expect(page.locator('#listingTakePhoto')).toBeVisible();
  await expect(page.locator('#listingForm')).toContainText('Post listing');
});

test('inbox and notification surfaces have private thread navigation controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#inboxPage')).toHaveCount(1);
  await expect(page.locator('#inboxThreadBack')).toHaveCount(1);
  await expect(page.locator('#messageInbox')).toHaveCount(1);
  await expect(page.locator('#refreshInbox')).toHaveCount(1);
  await page.evaluate(() => document.getElementById('notificationModal').classList.add('open'));
  await expect(page.locator('#notificationList')).toBeVisible();
  await expect(page.locator('#markAllNotifications')).toBeVisible();
});

test('messaging requires nonempty content and never sends a message', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.getElementById('composeModal').classList.add('open'));
  const body = page.locator('#composeBody');
  await expect(body).toBeVisible();
  expect(await body.evaluate(el => el.checkValidity())).toBe(false);
  await body.fill('Automated test message - not sent');
  expect(await body.evaluate(el => el.checkValidity())).toBe(true);
});
