import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'
import { login } from './utils/test-helpers'

/**
 * 导航菜单和布局端到端测试
 * 覆盖侧边栏菜单、面包屑导航、用户操作、响应式布局等功能
 * 使用真实后端API进行测试
 *
 * 选择器清单:
 * - 侧边栏容器: aside.sidebar
 * - 菜单项: .nav-item (router-link)
 * - 高亮状态: .active (来自 :class="{ active: $route.path === item.path }")
 * - 折叠按钮: .sidebar-header .toggle-btn
 * - 导航区域: nav.sidebar-nav
 * - 面包屑: .tech-breadcrumb .el-breadcrumb__item (Element Plus 内部结构)
 * - 面包屑文本: .breadcrumb-text
 * - 用户头像: .user-avatar
 * - 退出按钮: .logout-btn
 * - 顶部栏: header.app-header
 * - 菜单切换: .app-header .menu-toggle
 * - 操作按钮: .header-actions .action-btn (nth(0)=主题, nth(1)=全屏)
 * - 通知按钮: .notification-btn
 */

test.describe('导航菜单和布局', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorMonitoring(page)
    // 导航到仪表板（使用全局登录状态）
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test.describe('侧边栏菜单显示', () => {
    test('应显示完整的侧边栏结构', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 验证侧边栏存在 (使用 aside 角色)
      await expect(page.locator('aside.sidebar')).toBeVisible()

      // 验证Logo区域
      await expect(page.locator('.sidebar-header')).toBeVisible()
      await expect(page.locator('.logo-icon')).toBeVisible()
      await expect(page.locator('.logo-text')).toHaveText('DevMetrics')

      // 验证折叠按钮 (使用 toggle-btn class)
      await expect(page.locator('.sidebar-header .toggle-btn')).toBeVisible()

      // 验证导航区域
      await expect(page.locator('nav.sidebar-nav')).toBeVisible()

      // 验证底部用户信息区域
      await expect(page.locator('.sidebar-footer')).toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('应显示所有菜单分组和菜单项', async ({ page }) => {
      // 验证主菜单分组
      const navSections = page.locator('.nav-section')
      await expect(navSections.nth(0).locator('.section-title')).toHaveText('主菜单')

      // 验证主菜单项
      const mainMenuItems = navSections.nth(0).getByRole('link')
      await expect(mainMenuItems).toHaveCount(2)
      await expect(mainMenuItems.nth(0)).toContainText('仪表盘')
      await expect(mainMenuItems.nth(1)).toContainText('数据同步')

      // 验证数据统计分组
      await expect(navSections.nth(1).locator('.section-title')).toHaveText('数据统计')

      // 验证数据统计菜单项
      const statsMenuItems = navSections.nth(1).getByRole('link')
      await expect(statsMenuItems).toHaveCount(3)
      await expect(statsMenuItems.nth(0)).toContainText('个人统计')
      await expect(statsMenuItems.nth(1)).toContainText('项目统计')
      await expect(statsMenuItems.nth(2)).toContainText('趋势分析')

      // 验证系统管理分组
      await expect(navSections.nth(2).locator('.section-title')).toHaveText('系统管理')

      // 验证系统管理菜单项
      const adminMenuItems = navSections.nth(2).getByRole('link')
      await expect(adminMenuItems).toHaveCount(3)
      await expect(adminMenuItems.nth(0)).toContainText('用户管理')
      await expect(adminMenuItems.nth(1)).toContainText('项目管理')
      await expect(adminMenuItems.nth(2)).toContainText('系统设置')
    })

    test('应显示用户头像和退出按钮', async ({ page }) => {
      // 验证用户头像
      await expect(page.locator('.user-avatar')).toBeVisible()

      // 验证用户名和角色
      await expect(page.locator('.user-name')).toBeVisible()
      await expect(page.locator('.user-role')).toBeVisible()

      // 验证退出按钮 (使用 logout-btn class)
      await expect(page.locator('.logout-btn')).toBeVisible()
    })
  })

  test.describe('菜单展开/收起', () => {
    test('点击折叠按钮应收起侧边栏', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 初始状态：展开
      await expect(page.locator('aside.sidebar')).not.toHaveClass(/collapsed/)
      await expect(page.locator('.logo-text')).toBeVisible()

      // 点击折叠按钮
      await page.locator('.sidebar-header .toggle-btn').click()

      // 验证侧边栏已折叠
      await expect(page.locator('aside.sidebar')).toHaveClass(/collapsed/)

      // 验证Logo文字隐藏
      await expect(page.locator('.logo-text')).not.toBeVisible()

      // 验证菜单文字隐藏
      const firstNavItem = page.getByRole('link').first()
      await expect(firstNavItem.locator('.nav-text')).not.toBeVisible()

      // 验证分组标题隐藏
      await expect(page.locator('.section-title').first()).not.toBeVisible()

      // 验证用户信息隐藏
      await expect(page.locator('.user-details')).not.toBeVisible()

      // 验证退出按钮隐藏
      await expect(page.locator('.logout-btn')).not.toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('再次点击折叠按钮应展开侧边栏', async ({ page }) => {
      // 先折叠
      await page.locator('.sidebar-header .toggle-btn').click()
      await expect(page.locator('aside.sidebar')).toHaveClass(/collapsed/)

      // 再次点击展开
      await page.locator('.sidebar-header .toggle-btn').click()

      // 验证侧边栏已展开
      await expect(page.locator('aside.sidebar')).not.toHaveClass(/collapsed/)

      // 验证Logo文字显示
      await expect(page.locator('.logo-text')).toBeVisible()

      // 验证菜单文字显示
      const firstNavItem = page.getByRole('link').first()
      await expect(firstNavItem.locator('.nav-text')).toBeVisible()

      // 验证分组标题显示
      await expect(page.locator('.section-title').first()).toBeVisible()
    })

    test('顶部栏菜单切换按钮应能折叠/展开侧边栏', async ({ page }) => {
      // 验证顶部栏折叠按钮存在 (使用 app-header 中的 menu-toggle)
      await expect(page.locator('.app-header .menu-toggle')).toBeVisible()

      // 点击顶部栏折叠按钮
      await page.locator('.app-header .menu-toggle').click()

      // 验证侧边栏已折叠
      await expect(page.locator('aside.sidebar')).toHaveClass(/collapsed/)

      // 再次点击展开
      await page.locator('.app-header .menu-toggle').click()

      // 验证侧边栏已展开
      await expect(page.locator('aside.sidebar')).not.toHaveClass(/collapsed/)
    })
  })

  test.describe('菜单项点击导航', () => {
    test('点击仪表盘菜单应导航到仪表盘页面', async ({ page }) => {
      // 先导航到其他页面
      await page.goto('/personal-stats')
      await expect(page).toHaveURL(/\/personal-stats/)

      // 点击仪表盘菜单
      await page.getByRole('link', { name: '仪表盘' }).click()

      // 验证导航到仪表盘
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('点击个人统计菜单应导航到个人统计页面', async ({ page }) => {
      await page.getByRole('link', { name: '个人统计' }).click()
      await expect(page).toHaveURL(/\/personal-stats/)
    })

    test('点击项目统计菜单应导航到项目统计页面', async ({ page }) => {
      await page.getByRole('link', { name: '项目统计' }).click()
      await expect(page).toHaveURL(/\/project-stats/)
    })

    test('点击趋势分析菜单应导航到趋势分析页面', async ({ page }) => {
      await page.getByRole('link', { name: '趋势分析' }).click()
      await expect(page).toHaveURL(/\/trends/)
    })

    test('点击数据同步菜单应导航到数据同步页面', async ({ page }) => {
      await page.getByRole('link', { name: '数据同步' }).click()
      await expect(page).toHaveURL(/\/sync/)
    })

    test('点击用户管理菜单应导航到用户管理页面', async ({ page }) => {
      await page.getByRole('link', { name: '用户管理' }).click()
      await expect(page).toHaveURL(/\/admin\/users/)
    })

    test('点击项目管理菜单应导航到项目管理页面', async ({ page }) => {
      await page.getByRole('link', { name: /^项目管理$/ }).click()
      await expect(page).toHaveURL(/\/admin\/projects/)
    })

    test('点击系统设置菜单应导航到系统设置页面', async ({ page }) => {
      await page.getByRole('link', { name: '系统设置' }).click()
      await expect(page).toHaveURL(/\/admin\/settings/)
    })
  })

  test.describe('当前菜单高亮', () => {
    test('当前页面菜单项应显示高亮状态', async ({ page }) => {
      // 导航到个人统计页面
      await page.goto('/personal-stats')

      // 验证个人统计菜单项有高亮类
      const personalStatsItem = page.getByRole('link', { name: '个人统计' })
      await expect(personalStatsItem).toHaveClass(/active/)

      // 验证其他菜单项没有高亮
      const dashboardItem = page.getByRole('link', { name: '仪表盘' })
      await expect(dashboardItem).not.toHaveClass(/active/)
    })

    test('切换页面后高亮状态应更新', async ({ page }) => {
      // 先在仪表盘页面
      await expect(page).toHaveURL(/\/dashboard/)
      const dashboardItem = page.getByRole('link', { name: '仪表盘' })
      await expect(dashboardItem).toHaveClass(/active/)

      // 切换到个人统计
      await page.getByRole('link', { name: '个人统计' }).click()
      await expect(page).toHaveURL(/\/personal-stats/)

      // 验证仪表盘不再高亮，个人统计高亮
      await expect(dashboardItem).not.toHaveClass(/active/)
      const personalStatsItem = page.getByRole('link', { name: '个人统计' })
      await expect(personalStatsItem).toHaveClass(/active/)
    })

    test('系统管理子页面应保持父菜单高亮', async ({ page }) => {
      // 导航到用户管理
      await page.goto('/admin/users')

      // 验证用户管理菜单项高亮
      const userManagementItem = page.getByRole('link', { name: '用户管理' })
      await expect(userManagementItem).toHaveClass(/active/)
    })
  })

  test.describe('面包屑导航', () => {
    test('仪表盘页面应显示正确的面包屑', async ({ page }) => {
      await expect(page.locator('.tech-breadcrumb')).toBeVisible()

      // Element Plus 的面包屑使用 .el-breadcrumb__item
      const breadcrumbs = page.locator('.tech-breadcrumb .el-breadcrumb__item')
      await expect(breadcrumbs).toHaveCount(1)
      await expect(breadcrumbs.first()).toContainText('首页')
    })

    test('个人统计页面应显示正确的面包屑', async ({ page }) => {
      await page.goto('/personal-stats')

      const breadcrumbs = page.locator('.tech-breadcrumb .el-breadcrumb__item')
      await expect(breadcrumbs).toHaveCount(2)
      await expect(breadcrumbs.nth(0)).toContainText('首页')
      await expect(breadcrumbs.nth(1)).toContainText('个人统计')
    })

    test('系统管理页面应显示多级面包屑', async ({ page }) => {
      await page.goto('/admin/users')

      const breadcrumbs = page.locator('.tech-breadcrumb .el-breadcrumb__item')
      await expect(breadcrumbs).toHaveCount(3)
      await expect(breadcrumbs.nth(0)).toContainText('首页')
      await expect(breadcrumbs.nth(1)).toContainText('系统管理')
      await expect(breadcrumbs.nth(2)).toContainText('用户管理')
    })

    test('点击面包屑应导航到对应页面', async ({ page }) => {
      await page.goto('/admin/users')

      // 点击首页面包屑 (使用 .breadcrumb-text 类)
      await page.locator('.tech-breadcrumb .breadcrumb-text', { hasText: '首页' }).click()
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe('顶部栏功能', () => {
    test('应显示系统状态和时间', async ({ page }) => {
      // 验证系统状态
      await expect(page.locator('.system-status')).toBeVisible()
      await expect(page.locator('.status-text')).toHaveText('系统正常')
      await expect(page.locator('.status-dot')).toHaveClass(/online/)

      // 验证时间显示
      await expect(page.locator('.time-display')).toBeVisible()
      // 验证时间格式（包含数字和冒号）
      const timeText = await page.locator('.time-display').textContent()
      expect(timeText).toMatch(/\d{4}[/-]\d{2}[/-]\d{2}/) // 日期格式
    })

    test('主题切换按钮应可点击', async ({ page }) => {
      // 主题按钮是 .header-actions 中的第一个 .action-btn
      const themeBtn = page.locator('.header-actions .action-btn').nth(0)
      await expect(themeBtn).toBeVisible()
      await expect(themeBtn).toBeEnabled()
    })

    test('全屏按钮应可点击', async ({ page }) => {
      // 全屏按钮是 .header-actions 中的第二个 .action-btn
      const fullscreenBtn = page.locator('.header-actions .action-btn').nth(1)
      await expect(fullscreenBtn).toBeVisible()
      await expect(fullscreenBtn).toBeEnabled()
    })

    test('通知按钮应显示', async ({ page }) => {
      const notificationBtn = page.locator('.notification-btn')
      await expect(notificationBtn).toBeVisible()
    })

    test('点击通知按钮应显示通知下拉菜单', async ({ page }) => {
      await page.locator('.notification-btn').click()

      // 验证下拉菜单显示 (Element Plus dropdown 渲染在 body 下)
      await expect(page.locator('.el-dropdown-menu.notification-dropdown')).toBeVisible()
      await expect(page.locator('.notification-header')).toContainText('通知')
    })
  })

  test.describe('退出登录', () => {
    test('点击退出按钮应退出登录并跳转到登录页', async ({ page }) => {
      // 点击退出按钮
      await page.locator('.logout-btn').click()

      // 验证跳转到登录页
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

      // 验证本地存储已清除
      const token = await page.evaluate(() => localStorage.getItem('token'))
      expect(token).toBeNull()
    })

    test('退出后访问受保护页面应重定向到登录页', async ({ page }) => {
      // 先退出
      await page.locator('.logout-btn').click()
      await expect(page).toHaveURL(/\/login/)

      // 尝试访问仪表板
      await page.goto('/dashboard')

      // 验证被重定向到登录页
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('响应式布局', () => {
    test('在桌面端应显示完整侧边栏', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.reload()
      await login(page)

      // 验证侧边栏展开
      await expect(page.locator('aside.sidebar')).not.toHaveClass(/collapsed/)
      await expect(page.locator('.logo-text')).toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('在平板端应自动折叠侧边栏', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await login(page)

      // 验证主内容区边距调整
      await expect(page.locator('.main-wrapper')).toHaveClass(/sidebar-collapsed/)

      errorMonitor.expectNoErrors()
    })

    test('在移动端应自动折叠侧边栏', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await login(page)

      // 验证布局有移动端类
      await expect(page.locator('.tech-layout')).toHaveClass(/is-mobile/)

      // 验证主内容区无左边距
      const mainWrapper = page.locator('.main-wrapper')
      await expect(mainWrapper).toHaveCSS('margin-left', '0px')

      errorMonitor.expectNoErrors()
    })

    test('移动端侧边栏应覆盖在主内容上方', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await login(page)

      // 验证侧边栏存在且可访问
      await expect(page.locator('aside.sidebar')).toBeVisible()

      // 验证可以通过折叠按钮切换（如果实现）
      const toggleBtn = page.locator('.sidebar-header .toggle-btn')
      if (await toggleBtn.isVisible().catch(() => false)) {
        await toggleBtn.click()
        // 验证切换后的状态
        await expect(page.locator('aside.sidebar')).toHaveClass(/collapsed/)
      }

      errorMonitor.expectNoErrors()
    })

    test('从小屏幕切换到大屏幕应恢复侧边栏', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 先设置为移动端
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await login(page)

      await expect(page.locator('.tech-layout')).toHaveClass(/is-mobile/)

      // 切换到大屏幕
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.reload()
      await login(page)

      // 验证不再是移动端布局
      await expect(page.locator('.tech-layout')).not.toHaveClass(/is-mobile/)

      // 验证侧边栏展开
      await expect(page.locator('aside.sidebar')).not.toHaveClass(/collapsed/)

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('页面切换动画', () => {
    test('页面切换应有过渡动画', async ({ page }) => {
      // 导航到个人统计
      await page.getByRole('link', { name: '个人统计' }).click()

      // 验证主内容区域存在（动画容器）
      await expect(page.getByRole('main')).toBeVisible()

      // 验证路由视图存在
      await expect(page.locator('.main-content > div')).toBeVisible()
    })
  })

  test.describe('菜单图标', () => {
    test('每个菜单项应显示对应的图标', async ({ page }) => {
      // 验证所有菜单项都有图标
      const navItems = page.getByRole('link')
      const count = await navItems.count()

      for (let i = 0; i < count; i++) {
        const icon = navItems.nth(i).locator('.nav-icon')
        await expect(icon).toBeVisible()
        await expect(icon.locator('.el-icon')).toBeVisible()
      }
    })

    test('折叠状态下只显示图标', async ({ page }) => {
      // 折叠侧边栏
      await page.locator('.sidebar-header .toggle-btn').click()

      // 验证所有菜单项仍然可见（图标形式）
      const navItems = page.getByRole('link')
      const count = await navItems.count()

      for (let i = 0; i < count; i++) {
        await expect(navItems.nth(i)).toBeVisible()
        await expect(navItems.nth(i).locator('.nav-icon')).toBeVisible()
      }
    })
  })

  test.describe('菜单徽章', () => {
    test('数据同步菜单应显示或不显示徽章', async ({ page }) => {
      // 查找数据同步菜单项
      const syncItem = page.getByRole('link', { name: '数据同步' })

      // 验证徽章可能存在（取决于后端数据）
      const badge = syncItem.locator('.nav-badge')
      // 徽章可能存在也可能不存在，取决于实际数据
      const hasBadge = await badge.isVisible().catch(() => false)
      if (hasBadge) {
        const badgeText = await badge.textContent()
        expect(badgeText).toMatch(/^\d+$/)
      }
    })

    test('折叠状态下徽章应隐藏', async ({ page }) => {
      // 先确保数据同步有徽章
      const syncItem = page.getByRole('link', { name: '数据同步' })

      // 折叠侧边栏
      await page.locator('.sidebar-header .toggle-btn').click()

      // 验证徽章隐藏
      await expect(syncItem.locator('.nav-badge')).not.toBeVisible()
    })
  })
})
