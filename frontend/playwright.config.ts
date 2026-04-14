import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 端到端测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // 完全并行运行测试
  fullyParallel: true,

  // 失败时禁止重复运行
  forbidOnly: !!process.env.CI,

  // 重试次数 (CI环境重试2次)
  retries: process.env.CI ? 2 : 0,

  // 并行工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 测试报告器
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // 全局设置 - 执行登录并保存状态
  globalSetup: './e2e/global-setup.ts',

  // 共享配置
  use: {
    // 基础URL
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // 共享登录状态
    storageState: 'e2e/.auth/user.json',

    // 收集追踪 (仅在重试时收集)
    trace: 'on-first-retry',

    // 截图 (仅在失败时)
    screenshot: 'only-on-failure',

    // 视频 (仅在重试时)
    video: 'on-first-retry',

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 动作超时 (30秒)
    actionTimeout: 30000,

    // 导航超时 (60秒)
    navigationTimeout: 60000,
  },

  // 项目配置 (不同浏览器)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 可选: 添加更多浏览器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // 移动端测试
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // 本地开发服务器配置
  webServer: [
    {
      command: 'cd ../backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000',
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
})
