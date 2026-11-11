import { expect, test } from '@playwright/test'
import { noHorizontalScroll } from './helpers'

test('onboarding slides lead to Connect, with a demo fallback outside Nimiq Pay', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page.getByRole('heading', { name: /Grow your savings/ })).toBeVisible()
  await noHorizontalScroll(page)
  await page.getByRole('button', { name: 'Get started' }).click()
  await expect(page.getByRole('heading', { name: 'Save to evolve' })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Your money stays yours/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Connect Nimiq Pay' }).click()
  // Not inside Nimiq Pay: friendly explanation + open-in-app link, never a crash.
  await expect(page.getByText('Open Sprout in Nimiq Pay')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('link', { name: 'Try the demo' })).toBeVisible()
})

test('unauthenticated home redirects to onboarding', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL('**/onboarding**')
})
