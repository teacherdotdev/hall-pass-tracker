import { expect, test } from '@playwright/test';

/**
 * A page's tips (the orange spotlight and its card) step aside while a dialog
 * is open, so they never cover it, and come back once it closes.
 */
test('a tip waits behind an open dialog and comes back after it closes', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 960 });
  await page.goto('/classes/new');
  await page.getByLabel('Class name').fill('Math');
  await page.getByRole('button', { name: 'Create class' }).click();

  const tip = page.locator('.tip');
  const spotlight = page.locator('.spotlight');
  const addStudents = page.getByRole('heading', { name: 'Add students' });

  // Creating a class opens Add students straight away: the roster tip waits.
  await expect(addStudents).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(tip).toBeHidden();
  await expect(spotlight).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(addStudents).toBeHidden();
  await expect(tip).toContainText('Classes are your rosters');
  await expect(spotlight).toBeVisible();

  // Opening a dialog while the tip shows hides it, and the dialog is on top.
  await page.getByRole('button', { name: 'Add students' }).click();
  await expect(addStudents).toBeVisible();
  await expect(tip).toBeHidden();
  await expect(spotlight).toBeHidden();
  const heading = (await addStudents.boundingBox())!;
  const onTop = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('.dialog') !== null,
    { x: heading.x + heading.width / 2, y: heading.y + heading.height / 2 },
  );
  expect(onTop).toBe(true);

  // Escape closes only the dialog; the tip isn't counted as seen.
  await page.keyboard.press('Escape');
  await expect(addStudents).toBeHidden();
  await expect(tip).toContainText('Classes are your rosters');
  await tip.getByRole('button', { name: 'Got it' }).click();
  await expect(tip).toBeHidden();
});

/**
 * Today's "What's changed": a teacher who used Happy Hallways before sees it
 * once, after any dialog that's open closes; a brand-new teacher never does.
 */
test("a returning teacher sees today's update once; a brand-new one never does", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const update = page.getByRole('heading', { name: 'Student PINs' });

  // A brand-new teacher.
  await page.goto('/classes/new');
  await page.getByLabel('Class name').fill('Math');
  await page.getByRole('button', { name: 'Create class' }).click();
  await expect(page.getByRole('heading', { name: 'Add students' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(update).toBeHidden();

  // A teacher who had seen every update before today's.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('hallway.account')!);
    saved.seenPopups = { '2026-10-destination-limits': 'x', '2026-10-schedule': 'x', '2026-10-home': 'x' };
    localStorage.setItem('hallway.account', JSON.stringify(saved));
  });

  // Arriving with a dialog open, the update waits until it closes.
  await page.goto(page.url() + '?add');
  await expect(page.getByRole('heading', { name: 'Add students' })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(update).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(update).toBeVisible();

  // Only today's update, short enough to fit, with links to each place.
  const dialog = page.getByRole('dialog', { name: 'Thank you for all your feedback' });
  for (const title of ['One limit for the whole class', 'Can always go', 'Student PINs', 'Student link']) {
    await expect(dialog.getByRole('heading', { name: title })).toBeVisible();
  }
  await expect(dialog.getByRole('heading', { name: 'Everything for the day is on Home' })).toBeHidden();
  await expect(dialog).toContainText('Also: Drag your classes in the sidebar');
  const box = (await dialog.locator('.whats-changed').boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(768 - 32);

  // A link goes there and counts as seen.
  await dialog.getByRole('link', { name: 'Pass Options →' }).click();
  await expect(page).toHaveURL(/\/pass-options$/);
  await expect(update).toBeHidden();
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(update).toBeHidden();

  // Never on the kiosk.
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('hallway.account')!);
    saved.seenPopups = {};
    localStorage.setItem('hallway.account', JSON.stringify(saved));
  });
  await page.goto('/door');
  await page.waitForTimeout(1000);
  await expect(page.getByRole('heading', { name: 'Thank you for all your feedback' })).toBeHidden();

  // Got it closes it for good too.
  await page.goto('/history');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.reload();
  await page.waitForTimeout(1000);
  await expect(update).toBeHidden();
});
