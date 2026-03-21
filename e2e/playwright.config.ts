import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'pnpm dev:api',
      cwd: '..',
      port: 3333,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev:frontend',
      cwd: '..',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
