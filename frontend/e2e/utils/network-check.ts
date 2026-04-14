import { Page } from '@playwright/test'

/**
 * 网络连接检查工具
 * 帮助诊断 E2E 测试中的后端连接问题
 */

export interface NetworkStatus {
  backendReachable: boolean
  frontendReachable: boolean
  authTokenPresent: boolean
  error?: string
}

/**
 * 检查网络连接状态
 */
export async function checkNetworkStatus(page: Page): Promise<NetworkStatus> {
  const status: NetworkStatus = {
    backendReachable: false,
    frontendReachable: false,
    authTokenPresent: false,
  }

  try {
    // 检查前端是否可达
    const currentUrl = page.url()
    status.frontendReachable = currentUrl.startsWith('http')

    // 检查 token 是否存在
    const token = await page.evaluate(() => localStorage.getItem('token'))
    status.authTokenPresent = !!token

    // 检查后端是否可达
    const backendCheck = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        return response.ok
      } catch {
        return false
      }
    })
    status.backendReachable = backendCheck

    return status
  } catch (error) {
    status.error = error instanceof Error ? error.message : String(error)
    return status
  }
}

/**
 * 格式化网络状态报告
 */
export function formatNetworkStatus(status: NetworkStatus): string {
  const lines = [
    '=== 网络连接诊断 ===',
    `前端可达: ${status.frontendReachable ? '✅' : '❌'}`,
    `后端可达: ${status.backendReachable ? '✅' : '❌'}`,
    `认证令牌: ${status.authTokenPresent ? '✅' : '❌'}`,
  ]

  if (status.error) {
    lines.push(`错误信息: ${status.error}`)
  }

  lines.push('===================')

  return lines.join('\n')
}

/**
 * 在测试中打印网络状态
 */
export async function diagnoseNetwork(page: Page): Promise<void> {
  const status = await checkNetworkStatus(page)
  console.log(formatNetworkStatus(status))
}
