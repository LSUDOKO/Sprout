import { expect, test } from '@playwright/test'
import { startDemo } from './helpers'

test('create a squad in one browser, join it from another, send a treat', async ({ browser }) => {
  const a = await browser.newContext()
  const b = await browser.newContext()
  const pa = await a.newPage()
  const pb = await b.newPage()
  await startDemo(pa, 'Alpha')
  await startDemo(pb, 'Beta')

  await pa.goto('/squad')
  await pa.getByRole('button', { name: 'Create squad' }).click()
  await pa.getByLabel('Squad name').fill('Night Owls')
  await pa.getByRole('button', { name: 'Create squad' }).last().click()
  await expect(pa.getByRole('heading', { name: 'Squad: Night Owls' })).toBeVisible()
  await pa.getByRole('button', { name: 'Invite friends' }).click()
  const code = (await pa.locator('p.tracking-\\[0\\.25em\\]').innerText()).trim()
  expect(code).toMatch(/^[A-Z2-9]{6}$/)

  await pb.goto(`/join/${code}`)
  await expect(pb.getByRole('heading', { name: 'Join Night Owls' })).toBeVisible()
  await pb.getByRole('button', { name: 'Join squad' }).click()
  await expect(pb.getByRole('heading', { name: 'Squad: Night Owls' })).toBeVisible()
  await expect(pb.getByText('Alpha')).toBeVisible()

  await pb.getByRole('button', { name: 'Send', exact: true }).click()
  await pb.getByRole('button', { name: /Alpha/ }).click()
  await pb.getByRole('button', { name: /Send 5 NIM/ }).click()
  await expect(pb.getByText('Treat sent! 🎁')).toBeVisible({ timeout: 40_000 })

  await pa.goto('/')
  await expect(pa.getByText('Beta sent Sprout a treat!')).toBeVisible({ timeout: 40_000 })
  await a.close()
  await b.close()
})
