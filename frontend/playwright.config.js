import { defineConfig, devices } from '@playwright/test'

// E2E runs against the full running stack. Bring it up first:
//   docker compose up --build
// then:  npm run test:e2e   (after `npx playwright install` once)
// Override the target with E2E_BASE_URL when the frontend runs elsewhere.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
