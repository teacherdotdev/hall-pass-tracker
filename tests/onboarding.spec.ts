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
