import { expect, test } from '@playwright/test';

test('a stale flight request provides a recovery path', async ({ page }) => {
  await page.goto('/flights/requests/fr-does-not-exist', { waitUntil: 'networkidle' });

  await expect(
    page.getByText('This flight request no longer exists. The demo database may have been reset.', {
      exact: true
    })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to requests' })).toHaveAttribute(
    'href',
    '/flights/requests'
  );
});
