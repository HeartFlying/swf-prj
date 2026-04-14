import { Page } from '@playwright/test'

/**
 * 登录 API Mock Fixtures
 * 提供统一的登录相关 API Mock 响应
 */

/**
 * 标准登录成功响应数据
 */
export const loginSuccessResponse = {
  code: 200,
  message: 'success',
  data: {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'bearer',
    expiresIn: 3600,
    user: {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      isActive: true,
      role: { id: 1, name: 'admin', permissions: ['*'] }
    }
  }
}

/**
 * 普通用户登录成功响应数据
 */
export const userLoginSuccessResponse = {
  code: 200,
  message: 'success',
  data: {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    tokenType: 'bearer',
    expiresIn: 3600,
    user: {
      id: 2,
      username: 'testuser',
      email: 'test@example.com',
      isActive: true,
      role: { id: 2, name: 'user', permissions: [] }
    }
  }
}

/**
 * 登录失败响应数据
 */
export const loginFailureResponse = {
  code: 401,
  message: '用户名或密码错误'
}

/**
 * 设置登录 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义响应数据，默认使用 loginSuccessResponse
 */
export async function mockLoginApi(
  page: Page,
  response: object = loginSuccessResponse
): Promise<void> {
  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置登录失败 API Mock
 * @param page - Playwright Page 对象
 * @param response - 自定义失败响应数据，默认使用 loginFailureResponse
 */
export async function mockLoginFailureApi(
  page: Page,
  response: object = loginFailureResponse
): Promise<void> {
  await page.route('**/api/v1/auth/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * 设置登录网络错误 API Mock
 * @param page - Playwright Page 对象
 */
export async function mockLoginNetworkErrorApi(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', async route => {
    await route.abort('failed')
  })
}

/**
 * 设置延迟登录 API Mock（用于测试加载状态）
 * @param page - Playwright Page 对象
 * @param delayMs - 延迟时间（毫秒），默认 1000ms
 * @param response - 自定义响应数据，默认使用 loginSuccessResponse
 */
export async function mockLoginWithDelayApi(
  page: Page,
  delayMs: number = 1000,
  response: object = loginSuccessResponse
): Promise<void> {
  await page.route('**/api/v1/auth/login', async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}
