import { expect, test } from '@playwright/test'
import { noHorizontalScroll, plant, startDemo } from './helpers'

test('plant → verified on the demo chain → week kept → evolves to Sprout', async ({ page }) => {
  await startDemo(page, 'Mochi')
  await noHorizontalScroll(page)
  // invariant: < 100 NIM cannot plant
  await page.getByRole('button', { name: /Plant your seed/ }).first().click()
  await page.getByRole('button', { name: 'Custom' }).click()
  await page.getByLabel('Amount in NIM').fill('50')
  await expect(page.getByText('Minimum to start is 100 NIM').last()).toBeVisible()
  await page.keyboard.press('Escape')

  await plant(page, '1000')
  await expect(page.getByText(/Mochi evolved/)).toBeVisible()
  await page.getByRole('button', { name: /Meet Sprout/ }).click()
  await expect(page.getByRole('heading', { name: '+1,000 NIM saved!' })).toBeVisible()
  await expect(page.getByText(/Week kept! Streak 1/)).toBeVisible()
  await page.getByRole('button', { name: 'Back to garden' }).click()
  await expect(page.getByText('Mochi · Sprout')).toBeVisible()
  await expect(page.getByText('1,000 NIM').first()).toBeVisible()

  // feed more via the + button
  await page.getByRole('button', { name: 'Feed Sprout' }).click()
  await page.getByRole('button', { name: 'Save 100 NIM' }).click()
  await expect(page.getByRole('heading', { name: '+100 NIM saved!' })).toBeVisible()
  await page.getByRole('button', { name: 'Back to garden' }).click()
  await expect(page.getByText('1,100 NIM').first()).toBeVisible()
})

test('rewards grow Sprout overnight and a fast-forwarded week keeps the streak honest', async ({ page }) => {
  await startDemo(page, 'Kiwi')
  await plant(page, '600')
  await page.getByRole('button', { name: 'Back to garden' }).click()
  await page.goto('/me')
  await page.getByRole('button', { name: /Simulate rewards/ }).click()
  await expect(page.getByText('Rewards arrived in your stake')).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('+20 NIM')).toBeVisible()
  await page.goto('/me')
  await page.getByRole('button', { name: /Fast-forward 1 week/ }).click()
  await expect(page.getByText('A week went by…')).toBeVisible()
  await page.goto('/streak')
  await expect(page.getByRole('heading', { name: 'week streak!' })).toBeVisible()
})
