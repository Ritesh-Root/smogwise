import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PLAN_BUTTON = { name: 'Get my clean-air plan' };
const VIEWPORTS = {
  'desktop, light': { viewport: { width: 1280, height: 800 }, colorScheme: 'light' },
  'phone (375 px), dark': { viewport: { width: 375, height: 800 }, colorScheme: 'dark' },
  'small phone (320 px), light': { viewport: { width: 320, height: 640 }, colorScheme: 'light' },
};

/** Collect console errors and Content Security Policy violations while a page runs. */
async function watchForProblems(page) {
  const problems = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return problems;
}

async function buildPlan(page, { hindi = false } = {}) {
  await page.getByLabel(/City or neighbourhood/).fill('Anand Vihar, Delhi');
  await page.getByRole('checkbox', { name: 'Children' }).check();
  if (hindi) await page.getByRole('radio', { name: /Hindi/ }).check();
  await page.getByRole('button', PLAN_BUTTON).click();
  const region = page.getByRole('region', { name: 'Your clean-air plan' });
  await region.waitFor();
  return region;
}

const violations = async (page) =>
  (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations;
const summary = (found) => found.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')}`);

for (const [name, options] of Object.entries(VIEWPORTS)) {
  test.describe(name, () => {
    test.use(options);

    test('has no accessibility violations on the form or the results, colour contrast included', async ({ page }) => {
      await page.goto('/');
      expect(summary(await violations(page))).toEqual([]);
      await buildPlan(page);
      await expect(page.getByRole('heading', { name: 'Ask a follow-up' })).toBeVisible();
      expect(summary(await violations(page))).toEqual([]);
    });

    test('never scrolls sideways and logs no errors or CSP violations', async ({ page }) => {
      const problems = await watchForProblems(page);
      await page.goto('/');
      await buildPlan(page);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
      expect(problems).toEqual([]);
    });
  });
}

test.describe('using the app', () => {
  test('keyboard: the skip link comes first and a failed submit moves focus to the place field', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.getByRole('button', PLAN_BUTTON).click();
    await expect(page.getByLabel(/City or neighbourhood/)).toBeFocused();
    await expect(page.getByLabel(/City or neighbourhood/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('a plan appears, takes focus, and the chat answers in formatted text', async ({ page }) => {
    await page.goto('/');
    const region = await buildPlan(page);
    await expect(region).toBeFocused();
    await expect(page.getByText('Air is poor today')).toBeVisible();
    await expect(page.getByText('Children: Keep children indoors.')).toBeVisible();
    await page.getByRole('button', { name: 'Which mask should we use?' }).click();
    await expect(page.locator('strong', { hasText: 'afternoon' })).toBeVisible();
  });

  test('a Hindi plan has Hindi headings inside a Hindi language region', async ({ page }) => {
    await page.goto('/');
    await buildPlan(page, { hindi: true });
    const heading = page.getByRole('heading', { name: 'आज की आपकी योजना' });
    await expect(heading).toBeVisible();
    await expect(page.locator('[lang="hi"]', { has: heading })).toHaveCount(1);
  });

  test('the forecast chart is described in text and has a table alternative', async ({ page }) => {
    await page.goto('/');
    await buildPlan(page);
    await expect(page.getByRole('img', { name: /Forecast air quality for the next 24 hours/ })).toBeVisible();
    await page.getByText('View the forecast as a table').click();
    await expect(page.getByRole('table', { name: 'Hourly air quality forecast' })).toBeVisible();
  });

  test('the page is served with the security headers the README promises', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).not.toContain('unsafe-inline');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
