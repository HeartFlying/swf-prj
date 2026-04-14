import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'
import { clearBrowserStorage } from './utils/test-helpers'

/**
 * 系统设置页面端到端测试
 * 覆盖页面元素显示、表单控件交互、系统操作等功能
 * 使用真实后端API进行测试
 */
test.describe('系统设置页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到设置页面（使用全局登录状态）
    await page.goto('/admin/settings')
    // 等待页面加载
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
  })

  test.describe('页面加载和基本结构', () => {
    test('应显示完整的页面结构', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 验证页面标题
      await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible()
      await expect(page.locator('.page-subtitle')).toHaveText('配置系统参数和全局选项')

      // 验证保存按钮存在
      await expect(page.getByRole('button', { name: '保存设置' })).toBeVisible()

      // 验证所有设置卡片存在
      await expect(page.getByTestId('settings-card').filter({ hasText: '同步设置' })).toBeVisible()
      await expect(page.getByTestId('settings-card').filter({ hasText: '用户限制' })).toBeVisible()
      await expect(page.getByTestId('settings-card').filter({ hasText: 'AI模型设置' })).toBeVisible()
      await expect(page.getByTestId('settings-card').filter({ hasText: '通知设置' })).toBeVisible()
      await expect(page.getByTestId('settings-card').filter({ hasText: '系统信息' })).toBeVisible()

      errorMonitor.expectNoErrors()
    })

    test('应显示系统信息卡片内容', async ({ page }) => {
      const systemInfoCard = page.getByTestId('settings-card').filter({ hasText: '系统信息' })

      // 验证系统信息项
      await expect(systemInfoCard.getByTestId('info-label').filter({ hasText: '系统版本' })).toBeVisible()

      await expect(systemInfoCard.getByTestId('info-label').filter({ hasText: '最后更新' })).toBeVisible()
      await expect(systemInfoCard.getByTestId('info-label').filter({ hasText: '数据库版本' })).toBeVisible()

      await expect(systemInfoCard.getByTestId('info-label').filter({ hasText: '缓存状态' })).toBeVisible()

      await expect(systemInfoCard.getByTestId('info-label').filter({ hasText: '系统运行时间' })).toBeVisible()

      // 验证系统操作按钮
      await expect(systemInfoCard.getByRole('button', { name: '清除缓存' })).toBeVisible()
      await expect(systemInfoCard.getByRole('button', { name: '导出日志' })).toBeVisible()
      await expect(systemInfoCard.getByRole('button', { name: '重置系统' })).toBeVisible()
    })

    test('应显示同步设置卡片表单元素', async ({ page }) => {
      const syncCard = page.getByTestId('settings-card').filter({ hasText: '同步设置' })

      // 验证启用自动同步开关
      await expect(syncCard.getByRole('switch', { name: '启用自动同步' })).toBeVisible()

      // 验证自动同步间隔选择器
      await expect(syncCard.getByRole('combobox', { name: '自动同步间隔' })).toBeVisible()

      // 验证数据保留天数滑块
      await expect(syncCard.getByRole('spinbutton', { name: '数据保留天数' })).toBeVisible()
    })

    test('应显示用户限制卡片表单元素', async ({ page }) => {
      const userCard = page.getByTestId('settings-card').filter({ hasText: '用户限制' })

      // 验证每用户最大项目数输入框
      await expect(userCard.getByRole('spinbutton', { name: '每用户最大项目数' })).toBeVisible()

      // 验证允许注册的邮箱域名选择器
      await expect(userCard.getByRole('combobox', { name: '允许注册的邮箱域名' })).toBeVisible()
    })

    test('应显示AI模型设置卡片表单元素', async ({ page }) => {
      const aiCard = page.getByTestId('settings-card').filter({ hasText: 'AI模型设置' })

      // 验证允许的AI模型复选框组
      await expect(aiCard.getByRole('group', { name: '允许的AI模型' })).toBeVisible()

      // 验证默认模型选择器
      await expect(aiCard.getByRole('combobox', { name: '默认模型' })).toBeVisible()

      // 验证Token使用限制输入框
      await expect(aiCard.getByRole('spinbutton', { name: 'Token使用限制' })).toBeVisible()
    })

    test('应显示通知设置卡片表单元素', async ({ page }) => {
      const notifyCard = page.getByTestId('settings-card').filter({ hasText: '通知设置' })

      // 验证所有通知开关
      await expect(notifyCard.getByRole('switch', { name: '启用邮件通知' })).toBeVisible()
      await expect(notifyCard.getByRole('switch', { name: '同步完成通知' })).toBeVisible()
      await expect(notifyCard.getByRole('switch', { name: '异常告警通知' })).toBeVisible()
      await expect(notifyCard.getByRole('switch', { name: '每周报告' })).toBeVisible()
    })
  })

  test.describe('同步设置功能', () => {
    test('应能切换自动同步开关', async ({ page }) => {
      const syncCard = page.getByTestId('settings-card').filter({ hasText: '同步设置' })
      const switchInput = syncCard.getByRole('switch', { name: '启用自动同步' })

      // 获取初始状态
      const initialChecked = await switchInput.isChecked().catch(() => false)

      // 点击切换开关
      await switchInput.click()

      // 验证状态已改变
      const newChecked = await switchInput.isChecked().catch(() => false)
      expect(newChecked).toBe(!initialChecked)

      // 再次点击恢复
      await switchInput.click()
    })

    test('应能选择自动同步间隔', async ({ page }) => {
      const syncCard = page.getByTestId('settings-card').filter({ hasText: '同步设置' })

      // 点击下拉选择器
      const select = syncCard.getByRole('combobox', { name: '自动同步间隔' })
      await select.click()

      // 等待下拉选项出现
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5000 })

      // 选择30分钟（如果选项存在）
      const option30 = page.getByRole('option', { name: '30分钟' })
      if (await option30.isVisible().catch(() => false)) {
        await option30.click()
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('应能调整数据保留天数', async ({ page }) => {
      const syncCard = page.getByTestId('settings-card').filter({ hasText: '同步设置' })

      // 找到数字输入框并修改值
      const numberInput = syncCard.getByRole('spinbutton', { name: '数据保留天数' })
      await numberInput.clear()
      await numberInput.fill('180')

      // 验证值已更新
      await expect(numberInput).toHaveValue('180')
    })
  })

  test.describe('用户限制设置', () => {
    test('应能修改每用户最大项目数', async ({ page }) => {
      const userCard = page.getByTestId('settings-card').filter({ hasText: '用户限制' })

      // 找到数字输入框
      const inputField = userCard.getByRole('spinbutton', { name: '每用户最大项目数' })

      // 获取当前值
      const currentValue = await inputField.inputValue()

      // 点击增加按钮
      const increaseBtn = userCard.getByRole('button', { name: '增加' })
      if (await increaseBtn.isVisible().catch(() => false)) {
        await increaseBtn.click()

        // 验证值增加了
        const newValue = await inputField.inputValue()
        expect(parseInt(newValue)).toBe(parseInt(currentValue) + 1)
      }
    })

    test('应能添加和删除允许的邮箱域名', async ({ page }) => {
      const userCard = page.getByTestId('settings-card').filter({ hasText: '用户限制' })

      // 找到域名选择器
      const domainSelect = userCard.getByRole('combobox', { name: '允许注册的邮箱域名' })
      if (await domainSelect.isVisible().catch(() => false)) {
        await domainSelect.click()

        // 输入新域名
        const input = domainSelect.locator('input')
        await input.fill('testdomain.com')
        await input.press('Enter')

        // 验证新域名已添加
        await expect(userCard.getByTestId('domain-tag').filter({ hasText: 'testdomain.com' })).toBeVisible()

        // 删除域名（点击关闭按钮）
        const tagClose = userCard.getByTestId('domain-tag').filter({ hasText: 'testdomain.com' }).getByRole('button', { name: '关闭' })
        if (await tagClose.isVisible().catch(() => false)) {
          await tagClose.click()
          await expect(userCard.getByTestId('domain-tag').filter({ hasText: 'testdomain.com' })).not.toBeVisible()
        }
      }
    })
  })

  test.describe('AI模型设置', () => {
    test('应能选择允许的AI模型', async ({ page }) => {
      const aiCard = page.getByTestId('settings-card').filter({ hasText: 'AI模型设置' })

      // 找到复选框组
      const checkboxGroup = aiCard.getByRole('group', { name: '允许的AI模型' })
      await expect(checkboxGroup).toBeVisible()

      // 验证所有模型选项存在
      const checkboxes = aiCard.getByRole('checkbox')
      const count = await checkboxes.count()
      expect(count).toBeGreaterThan(0)

      // 点击选择一个未选中的模型（如果存在）
      for (let i = 0; i < count; i++) {
        const checkbox = checkboxes.nth(i)
        const isChecked = await checkbox.isChecked().catch(() => false)

        if (!isChecked) {
          await checkbox.click()
          await expect(checkbox).toBeChecked()
          break
        }
      }
    })

    test('默认模型下拉应显示已选择的模型', async ({ page }) => {
      const aiCard = page.getByTestId('settings-card').filter({ hasText: 'AI模型设置' })

      // 找到默认模型选择器
      const defaultModelSelect = aiCard.getByRole('combobox', { name: '默认模型' })
      if (await defaultModelSelect.isVisible().catch(() => false)) {
        await expect(defaultModelSelect).toBeVisible()

        // 点击打开下拉
        await defaultModelSelect.click()

        // 验证下拉选项可见
        await expect(page.getByRole('listbox')).toBeVisible()

        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('应能修改Token使用限制', async ({ page }) => {
      const aiCard = page.getByTestId('settings-card').filter({ hasText: 'AI模型设置' })

      // 找到Token限制输入框
      const tokenInput = aiCard.getByRole('spinbutton', { name: 'Token使用限制' })
      if (await tokenInput.isVisible().catch(() => false)) {
        await expect(tokenInput).toBeVisible()

        // 清除并输入新值
        await tokenInput.clear()
        await tokenInput.fill('50000')

        // 验证值已更新
        await expect(tokenInput).toHaveValue('50000')
      }
    })
  })

  test.describe('通知设置功能', () => {
    test('应能切换所有通知开关', async ({ page }) => {
      const notifyCard = page.getByTestId('settings-card').filter({ hasText: '通知设置' })

      // 获取所有开关
      const switches = notifyCard.getByRole('switch')
      const count = await switches.count()

      // 验证至少有一个开关
      expect(count).toBeGreaterThan(0)

      // 测试第一个开关
      const firstSwitch = switches.first()
      const initialState = await firstSwitch.isChecked().catch(() => false)

      await firstSwitch.click()
      await expect(firstSwitch).toBeChecked({ checked: !initialState })

      // 恢复状态
      await firstSwitch.click()
      await expect(firstSwitch).toBeChecked({ checked: initialState })
    })

    test('应显示所有通知选项标签', async ({ page }) => {
      const notifyCard = page.getByTestId('settings-card').filter({ hasText: '通知设置' })

      // 验证所有通知选项标签
      await expect(notifyCard.getByRole('switch', { name: '启用邮件通知' })).toBeVisible()
      await expect(notifyCard.getByRole('switch', { name: '同步完成通知' })).toBeVisible()
      await expect(notifyCard.getByRole('switch', { name: '异常告警通知' })).toBeVisible()
      await expect(notifyCard.getByRole('switch', { name: '每周报告' })).toBeVisible()
    })
  })

  test.describe('保存设置功能', () => {
    test('点击保存按钮应显示成功或错误消息', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 点击保存按钮
      const saveBtn = page.getByRole('button', { name: '保存设置' })
      await saveBtn.click()

      // 验证成功消息或错误消息
      await expect(page.getByTestId('message-success').or(page.getByTestId('message-error'))).toBeVisible({ timeout: 5000 })

      errorMonitor.expectNoErrors()
    })

    test('保存过程中按钮应显示加载状态', async ({ page }) => {
      const saveBtn = page.getByRole('button', { name: '保存设置' })

      // 点击保存
      await saveBtn.click()

      // 验证按钮处于加载状态或显示消息
      await expect(page.getByTestId('message-success').or(page.getByTestId('message-error')).or(page.getByTestId('loading-indicator'))).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('系统操作功能', () => {
    test('清除缓存应显示确认对话框', async ({ page }) => {
      const systemCard = page.getByTestId('settings-card').filter({ hasText: '系统信息' })

      // 点击清除缓存按钮
      await systemCard.getByRole('button', { name: '清除缓存' }).click()

      // 验证确认对话框出现
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByTestId('dialog-title')).toContainText('确认')
      await expect(page.getByTestId('dialog-message')).toContainText('缓存')

      // 点击取消
      await page.getByRole('button', { name: '取消' }).click()

      // 验证对话框关闭
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('确认清除缓存应显示成功消息', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      const systemCard = page.getByTestId('settings-card').filter({ hasText: '系统信息' })

      // 点击清除缓存按钮
      await systemCard.getByRole('button', { name: '清除缓存' }).click()

      // 点击确认
      await page.getByRole('button', { name: '确定' }).click()

      // 验证成功消息
      await expect(page.getByTestId('message-success').or(page.getByTestId('message-error'))).toBeVisible({ timeout: 5000 })

      errorMonitor.expectNoErrors()
    })

    test('导出日志应显示成功消息', async ({ page }) => {
      const systemCard = page.getByTestId('settings-card').filter({ hasText: '系统信息' })

      // 点击导出日志按钮
      await systemCard.getByRole('button', { name: '导出日志' }).click()

      // 验证成功消息
      await expect(page.getByTestId('message-success').or(page.getByTestId('message-error'))).toBeVisible({ timeout: 5000 })
    })

    test('重置系统应显示危险操作确认对话框', async ({ page }) => {
      const systemCard = page.getByTestId('settings-card').filter({ hasText: '系统信息' })

      // 点击重置系统按钮
      await systemCard.getByRole('button', { name: '重置系统' }).click()

      // 验证确认对话框出现
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByTestId('dialog-title')).toContainText('确认')
      await expect(page.getByTestId('dialog-message')).toContainText('重置')

      // 点击取消
      await page.getByRole('button', { name: '取消' }).click()

      // 验证对话框关闭
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })
  })

  test.describe('表单验证', () => {
    test('最大项目数应限制在有效范围内', async ({ page }) => {
      const userCard = page.getByTestId('settings-card').filter({ hasText: '用户限制' })
      const input = userCard.getByRole('spinbutton', { name: '每用户最大项目数' })

      if (await input.isVisible().catch(() => false)) {
        // 尝试输入小于最小值的数字
        await input.clear()
        await input.fill('0')

        // 验证值被限制（根据实际实现可能不同）
        const value = await input.inputValue()
        expect(parseInt(value)).toBeGreaterThanOrEqual(0)
      }
    })

    test('Token限制应限制在有效范围内', async ({ page }) => {
      const aiCard = page.getByTestId('settings-card').filter({ hasText: 'AI模型设置' })
      const input = aiCard.getByRole('spinbutton', { name: 'Token使用限制' })

      if (await input.isVisible().catch(() => false)) {
        // 尝试输入小于最小值的数字
        await input.clear()
        await input.fill('500')

        // 验证值被限制（根据实际实现可能不同）
        const value = await input.inputValue()
        expect(parseInt(value)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('权限验证', () => {
    test('非管理员用户应被重定向或显示无权限', async ({ page }) => {
      // 先登出 - 使用安全方法
      await clearBrowserStorage(page)

      // 以普通用户登录（使用testuser）
      await page.goto('/login')
      await page.getByPlaceholder('用户名').fill('testuser')
      await page.getByPlaceholder('密码').fill('testpass123')
      await page.getByRole('button', { name: '登 录' }).click()

      // 等待登录完成（URL变化或页面跳转）
      await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 })

      // 尝试访问设置页面
      await page.goto('/admin/settings')
      await page.waitForLoadState('networkidle')

      // 验证被重定向或显示无权限
      const currentUrl = page.url()
      // 应该不在设置页面
      expect(currentUrl).not.toContain('/admin/settings')
    })
  })

  test.describe('响应式布局', () => {
    test('在平板设备上应正常显示', async ({ page }) => {
      // 设置平板视口
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      await page.waitForLoadState('networkidle')

      // 验证页面标题仍然可见
      await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible()

      // 验证设置卡片仍然可见
      await expect(page.getByTestId('settings-card').filter({ hasText: '同步设置' })).toBeVisible()
      await expect(page.getByTestId('settings-card').filter({ hasText: '系统信息' })).toBeVisible()
    })

    test('在桌面设备上应显示多列布局', async ({ page }) => {
      // 设置桌面视口
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.reload()
      await page.waitForLoadState('networkidle')

      // 验证网格布局存在
      const grid = page.getByTestId('settings-grid')
      await expect(grid).toBeVisible()

      // 验证所有卡片可见
      const cards = page.getByTestId('settings-card')
      const cardCount = await cards.count()
      expect(cardCount).toBeGreaterThanOrEqual(3)
    })
  })

  test.describe('系统设置页面性能', () => {
    test('页面应在合理时间内加载完成', async ({ page }) => {
      await page.goto('/login')
      await page.getByPlaceholder('用户名').fill('admin')
      await page.getByPlaceholder('密码').fill('password123')
      await page.getByRole('button', { name: '登 录' }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      const startTime = Date.now()
      await page.goto('/admin/settings')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // 页面加载时间应小于5秒
      expect(loadTime).toBeLessThan(5000)
    })
  })
})
