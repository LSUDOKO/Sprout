import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3200)
const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: external ?? `http://localhost:${PORT}`, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    { name: 'android-360', use: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } },
    { name: 'iphone-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        port: PORT,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
        env: { PGLITE_DIR: '.data/e2e', AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-123', DEMO_ENABLED: 'true', NODE_ENV: 'production' },
      },
})
