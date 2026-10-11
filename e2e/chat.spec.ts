import { type Browser, expect, type Page, test } from '@playwright/test';

/** Registers a brand-new user in its own browser context and returns the page. */
async function signUp(browser: Browser, name: string, options: { mobile?: boolean } = {}) {
  const context = await browser.newContext(
    options.mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {},
  );
  const page = await context.newPage();
  const email = `${name.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;

  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/chats$/);
  return { page, email };
}

async function startChatWith(page: Page, email: string, name: string) {
  await page.getByRole('button', { name: 'New chat' }).first().click();
  await page.getByPlaceholder('Search by name or email').fill(email);
  await page.getByRole('dialog').getByRole('button', { name }).click();
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+$/);
}

test('two people chat in real time', async ({ browser }) => {
  const ana = await signUp(browser, 'Ana');
  const ben = await signUp(browser, 'Ben', { mobile: true });

  await startChatWith(ana.page, ben.email, 'Ben');
  await ana.page.getByPlaceholder('Message').fill('Hi Ben!');
  await ana.page.keyboard.press('Enter');

  // Ben sees the new conversation appear with an unread badge, without reloading.
  const conversation = ben.page.getByRole('link', { name: /Ana/ });
  await expect(conversation).toContainText('Hi Ben!');
  await expect(conversation).toContainText('1');

  // Ben opens it (full screen on mobile) and sees Ana typing.
  await conversation.click();
  await expect(ben.page.getByRole('main').getByText('Hi Ben!')).toBeVisible();
  await ana.page.getByPlaceholder('Message').pressSequentially('How are you?', { delay: 30 });
  await expect(ben.page.getByRole('main').getByText('typing…')).toBeVisible();

  // Ben replies with the send button; Ana receives it and Ben's read receipt.
  await ben.page.getByPlaceholder('Message').fill('Great, thanks!');
  await ben.page.getByRole('button', { name: 'Send' }).click();
  await expect(ana.page.getByRole('main').getByText('Great, thanks!')).toBeVisible();
  await expect(ana.page.getByText('Seen', { exact: true })).toBeVisible();
});

test('signed-out visitors are sent to the login page', async ({ page }) => {
  await page.goto('/chats');
  await expect(page).toHaveURL(/\/login\?redirect=\/chats$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
