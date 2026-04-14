import { chromium, type FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { verifySetup } from './verify-setup'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 解析 JWT Token 获取过期时间
 * @param token JWT Token 字符串
 * @returns 过期时间戳（秒），解析失败返回 null
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    return payload.exp || null
  } catch {
    return null
  }
}

/**
 * 检查 Token 是否即将过期
 * @param token JWT Token 字符串
 * @param bufferMinutes 提前多少分钟认为过期（默认 30 分钟）
 * @returns true 表示已过期或即将过期
 */
function isTokenExpiringSoon(token: string, bufferMinutes = 30): boolean {
  const exp = getTokenExpiry(token)
  if (!exp) return true

  const expiryTime = exp * 1000 // 转换为毫秒
  const bufferTime = bufferMinutes * 60 * 1000
  const currentTime = Date.now()

  return currentTime >= (expiryTime - bufferTime)
}

/**
 * 从认证文件中读取 Token
 * @param authFile 认证文件路径
 * @returns Token 字符串，不存在则返回 null
 */
function getStoredToken(authFile: string): string | null {
  try {
    if (!fs.existsSync(authFile)) return null

    const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'))
    const localStorage = authData.origins?.[0]?.localStorage || []
    const tokenItem = localStorage.find((item: { name: string; value: string }) => item.name === 'token')
    return tokenItem?.value || null
  } catch {
    return null
  }
}

/**
 * 全局设置 - 在所有测试前运行
 * 用于执行真实登录并保存状态，避免每个测试都重新登录
 * 自动检测 Token 过期并在需要时重新登录
 */
async function globalSetup(config: FullConfig) {
  // 首先验证环境是否就绪
  const setupCheck = await verifySetup()
  if (!setupCheck.ok) {
    throw new Error('E2E 测试环境未就绪，请启动所需服务后重试')
  }

  const { baseURL } = config.projects[0].use
  const authDir = path.join(__dirname, '.auth')
  const authFile = path.join(authDir, 'user.json')

  // 确保.auth目录存在
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // 检查是否需要重新登录
  const shouldRelogin = process.env.FORCE_RELOGIN === 'true'

  if (!shouldRelogin) {
    const token = getStoredToken(authFile)

    if (token) {
      const exp = getTokenExpiry(token)
      const expDate = exp ? new Date(exp * 1000).toLocaleString() : 'unknown'

      if (!isTokenExpiringSoon(token, 30)) {
        console.log(`✓ Using existing authentication state (token expires at ${expDate})`)
        return
      }

      console.log(`⚠ Token expiring soon (expires at ${expDate}), performing re-login...`)
    } else {
      console.log('⚠ No valid token found, performing login...')
    }
  } else {
    console.log('⚠ FORCE_RELOGIN is set, performing fresh login...')
  }

  console.log('🔐 Performing global setup: authenticating with real backend...')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // 使用真实后端API进行登录
  // 凭据与 backend/init_db.py 和 backend/app/db/seeds.py 保持一致
  const username = process.env.E2E_TEST_USERNAME || 'admin'
  const password = process.env.E2E_TEST_PASSWORD || 'password123'

  try {
    // 访问登录页面
    console.log(`Navigating to ${baseURL}/login`)
    await page.goto(`${baseURL}/login`, { timeout: 60000 })
    console.log('Page loaded, waiting for network idle...')
    await page.waitForLoadState('networkidle', { timeout: 60000 })
    console.log('Network idle, waiting for DOM content loaded...')
    await page.waitForLoadState('domcontentloaded', { timeout: 60000 })

    // 等待输入框可见
    console.log('Waiting for username input...')
    await page.getByPlaceholder('用户名').waitFor({ state: 'visible', timeout: 30000 })

    // 执行真实登录 - 使用与登录页面匹配的placeholder
    console.log('Filling username...')
    await page.getByPlaceholder('用户名').fill(username)
    console.log('Filling password...')
    await page.getByPlaceholder('密码').fill(password)
    console.log('Clicking login button...')
    await page.locator('button.login-btn[type="submit"]').click()

    // 等待登录成功 (跳转到仪表板)
    await page.waitForURL(/\/dashboard|\//, { timeout: 10000 })

    // 等待token写入localStorage
    await page.waitForFunction(() => {
      return localStorage.getItem('token') !== null
    }, { timeout: 5000 })

    // 获取 Token 过期时间用于显示
    const newToken = await page.evaluate(() => localStorage.getItem('token'))
    const exp = newToken ? getTokenExpiry(newToken) : null
    const expDate = exp ? new Date(exp * 1000).toLocaleString() : 'unknown'

    console.log(`✅ Successfully logged in as ${username}`)
    console.log(`📝 Token expires at: ${expDate}`)

    // 保存登录状态
    await page.context().storageState({ path: authFile })
    console.log('💾 Authentication state saved to:', authFile)
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    console.error('\nMake sure:')
    console.error('1. Backend is running at http://localhost:8000')
    console.error('2. Database is seeded with test users (run: cd backend && python scripts/seed_e2e_data.py)')
    console.error('3. Frontend is running at', baseURL)
    console.error('\nTo force re-login, run: FORCE_RELOGIN=true npm run test:e2e')
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
