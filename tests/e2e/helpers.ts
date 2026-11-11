import { expect, type Page } from '@playwright/test'

/** Start a fresh demo session and hatch a pet. */
export async function startDemo(page: Page, name = 'Pip') {
  await page.goto('/demo')
  await page.waitForURL('**/hatch')
  await page.getByLabel('Name your Sprout').fill(name)
  await page.getByRole('button', { name: /Hatch/ }).click()
  await page.waitForURL((u) => u.pathname === '/')
  await expect(page.getByText(`${name} · Seed`)).toBeVisible()
}

/** Plant (first save) with a custom amount through the feed sheet. */
export async function plant(page: Page, nim: string) {
  await page.getByRole('button', { name: /Plant your seed/ }).first().click()
  await page.getByRole('button', { name: 'Custom' }).click()
  await page.getByLabel('Amount in NIM').fill(nim)
  await page.getByRole('button', { name: new RegExp(`Save ${nim.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} NIM`) }).click()
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}
