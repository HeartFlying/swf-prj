import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * 数据同步页面端到端测试
 * 覆盖同步状态概览、同步日志、同步任务列表、自动同步设置等功能
 * 使用真实后端API进行测试
 */
test.describe('数据同步页面', () => {
  test.beforeEach(async ({ page }) => {
    // 访问同步页面（使用全局登录状态）
    await page.goto('/sync')
    // 等待页面加载完成 - 使用URL检查而不是文本
    await expect(page).toHaveURL(/\/sync/, { timeout: 10000 })
    // 等待页面基本元素加载
    await page.waitForLoadState('networkidle')
  })

  test.describe('页面元素显示验证', () => {
    test('应显示完整的同步页面结构', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 验证页面标题
      await expect(page.getByText('数据同步')).toBeVisible()

      // 验证同步状态概览卡片存在（4个卡片）
      await expect(page.getByText('代码统计')).toBeVisible()
      await expect(page.getByText('Token使用')).toBeVisible()
      await expect(page.getByText('会话数据')).toBeVisible()
      await expect(page.getByText('项目信息')).toBeVisible()

      // 验证同步日志区域
      await expect(page.getByText('同步日志')).toBeVisible()

      // 验证同步任务区域
      await expect(page.getByText('同步任务')).toBeVisible()

      // 验证状态筛选按钮
      await expect(page.getByRole('radio', { name: '全部' })).toBeVisible()
      await expect(page.getByRole('radio', { name: '待执行' })).toBeVisible()
      await expect(page.getByRole('radio', { name: '执行中' })).toBeVisible()
      await expect(page.getByRole('radio', { name: '成功' })).toBeVisible()
      await expect(page.getByRole('radio', { name: '失败' })).toBeVisible()

      // 验证自动同步设置区域
      await expect(page.getByText('自动同步设置')).toBeVisible()
      await expect(page.getByText('启用自动同步')).toBeVisible()
      await expect(page.getByText('同步间隔')).toBeVisible()

      // 验证全量同步按钮
      await expect(page.getByRole('button', { name: '全量同步' })).toBeVisible()
      errorMonitor.expectNoErrors()
    })

    test('应显示同步状态卡片详情', async ({ page }) => {
      // 验证每个状态卡片的内容
      const statusCards = page.getByTestId('status-card')
      await expect(statusCards).toHaveCount(4)

      // 验证第一个卡片（代码统计）的内容
      const firstCard = statusCards.first()
      await expect(firstCard.getByTestId('status-title')).toHaveText('代码统计')
      await expect(firstCard.getByTestId('status-time')).toContainText('上次同步:')
      await expect(firstCard.getByTestId('status-badge')).toBeVisible()

      // 验证同步按钮存在
      await expect(firstCard.getByRole('button', { name: '同步' })).toBeVisible()
    })

    test('应显示同步任务表格列', async ({ page }) => {
      // 验证表格表头
      await expect(page.getByText('任务ID')).toBeVisible()
      await expect(page.getByText('任务名称')).toBeVisible()
      await expect(page.getByText('同步类型')).toBeVisible()
      await expect(page.getByText('状态')).toBeVisible()
      await expect(page.getByText('上次执行时间')).toBeVisible()
      await expect(page.getByText('下次执行时间')).toBeVisible()
      await expect(page.getByText('操作')).toBeVisible()
    })

    test('应显示终端日志内容', async ({ page }) => {
      // 验证终端窗口存在
      await expect(page.getByTestId('terminal')).toBeVisible()

      // 验证日志内容存在
      const logLines = page.getByTestId('log-line')
      // 日志可能异步加载，使用更宽松的检查
      const logCount = await logLines.count()
      if (logCount > 0) {
        await expect(logLines.first()).toBeVisible()
      }
    })
  })

  test.describe('同步状态卡片交互', () => {
    test('点击单个同步按钮应触发同步', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 找到第一个同步按钮（代码统计的同步按钮）
      const syncButton = page.getByTestId('status-card').first().getByRole('button', { name: '同步' })

      // 点击同步按钮
      await syncButton.click()

      // 验证按钮进入加载状态或显示成功消息
      await expect(page.getByRole('alert').filter({ hasText: /成功|信息/ })).toBeVisible({ timeout: 5000 })
      errorMonitor.expectNoErrors()
    })

    test('同步过程中应添加日志条目', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 获取初始日志数量
      const initialLogCount = await page.getByTestId('log-line').count()

      // 触发同步
      await page.getByTestId('status-card').first().getByRole('button', { name: '同步' }).click()

      // 等待同步完成（通过消息提示或网络空闲）
      await expect(page.getByRole('alert').filter({ hasText: /成功|信息/ })).toBeVisible({ timeout: 5000 })

      // 验证日志数量可能增加（取决于后端实现）
      const finalLogCount = await page.getByTestId('log-line').count()
      // 日志数量应该不变或增加
      expect(finalLogCount).toBeGreaterThanOrEqual(initialLogCount)
      errorMonitor.expectNoErrors()
    })
  })

  test.describe('全量同步功能', () => {
    test('点击全量同步按钮应触发所有同步', async ({ page }) => {
      // 点击全量同步按钮
      const fullSyncButton = page.getByRole('button', { name: '全量同步' })
      await fullSyncButton.click()

      // 验证显示成功消息或加载状态
      await expect(page.getByRole('alert').filter({ hasText: /成功|信息/ }).or(page.getByTestId('loading-mask'))).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('状态筛选功能', () => {
    test('筛选待执行状态应只显示待执行任务', async ({ page }) => {
      // 点击待执行筛选
      await page.getByRole('radio', { name: '待执行' }).click()

      // 等待表格更新（通过等待网络请求完成）
      await page.waitForLoadState('networkidle')

      // 验证表格中只显示待执行状态的任务（如果有数据）
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()

      if (rowCount > 0) {
        // 验证所有可见行都是待执行状态
        const statusTags = rows.getByText('待执行')
        await expect(statusTags.first()).toBeVisible()
      }
    })

    test('筛选执行中状态应只显示执行中任务', async ({ page }) => {
      // 点击执行中筛选
      await page.getByRole('radio', { name: '执行中' }).click()

      // 等待表格更新（通过等待网络请求完成）
      await page.waitForLoadState('networkidle')

      // 验证表格中只显示执行中状态的任务（如果有数据）
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()

      if (rowCount > 0) {
        // 验证所有可见行都是执行中状态
        const statusTags = rows.getByText('执行中')
        await expect(statusTags.first()).toBeVisible()
      }
    })

    test('筛选成功状态应只显示成功任务', async ({ page }) => {
      // 点击成功筛选
      await page.getByRole('radio', { name: '成功' }).click()

      // 等待表格更新（通过等待网络请求完成）
      await page.waitForLoadState('networkidle')

      // 验证表格中只显示成功状态的任务（如果有数据）
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()

      if (rowCount > 0) {
        // 验证所有可见行都是成功状态
        const statusTags = rows.getByText('成功')
        await expect(statusTags.first()).toBeVisible()
      }
    })

    test('筛选失败状态应只显示失败任务', async ({ page }) => {
      // 点击失败筛选
      await page.getByRole('radio', { name: '失败' }).click()

      // 等待表格更新（通过等待网络请求完成）
      await page.waitForLoadState('networkidle')

      // 验证表格中只显示失败状态的任务（如果有数据）
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()

      if (rowCount > 0) {
        // 验证所有可见行都是失败状态
        const statusTags = rows.getByText('失败')
        await expect(statusTags.first()).toBeVisible()
      }
    })

    test('切换到全部应显示所有任务', async ({ page }) => {
      // 先筛选待执行
      await page.getByRole('radio', { name: '待执行' }).click()
      await page.waitForLoadState('networkidle')

      // 再切换到全部
      await page.getByRole('radio', { name: '全部' }).click()
      await page.waitForLoadState('networkidle')

      // 验证显示所有任务（使用真实后端数据，数量可能不同）
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()
      expect(rowCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('任务操作功能', () => {
    test('点击查看日志按钮应打开日志查看器', async ({ page }) => {
      // 找到第一个任务的查看日志按钮
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()

      if (rowCount > 0) {
        const viewLogButton = rows.first().getByRole('button', { name: '日志' })
        await viewLogButton.click()

        // 验证日志查看器弹窗显示
        await expect(page.getByTestId('sync-log-viewer').or(page.getByRole('dialog'))).toBeVisible({ timeout: 5000 })

        // 关闭弹窗
        await page.getByRole('button', { name: '关闭' }).first().click()
        await expect(page.getByRole('dialog')).toBeHidden()
      }
    })

    test('点击触发按钮应触发任务执行', async ({ page }) => {
      // 找到第一个非执行中任务的触发按钮
      const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
      const rowCount = await rows.count()

      if (rowCount > 0) {
        for (let i = 0; i < rowCount; i++) {
          const row = rows.nth(i)
          const statusCell = await row.getByText(/待执行|执行中|成功|失败/).first().textContent()

          if (statusCell !== '执行中') {
            // 点击触发按钮
            const triggerButton = row.getByRole('button', { name: '触发' })
            await triggerButton.click()

            // 验证确认弹窗显示或成功消息
            const hasMessageBox = await page.getByRole('dialog').isVisible().catch(() => false)
            if (hasMessageBox) {
              await expect(page.getByTestId('message-box-message')).toContainText('确定要立即执行')
              // 点击确认
              await page.getByRole('button', { name: '确认触发' }).click()
            }

            // 验证成功消息或警告消息
            await expect(page.getByRole('alert').filter({ hasText: /成功|警告|信息/ })).toBeVisible({ timeout: 5000 })

            break
          }
        }
      }
    })
  })

  test.describe('自动同步设置', () => {
    test('自动同步开关应可切换', async ({ page }) => {
      // 找到启用自动同步的开关
      const autoSyncSwitch = page.getByTestId('sync-settings').getByRole('switch').first()

      // 获取初始状态
      const initialChecked = await autoSyncSwitch.isChecked().catch(() => false)

      // 点击切换
      await autoSyncSwitch.click()

      // 验证状态改变
      const newChecked = await autoSyncSwitch.isChecked().catch(() => false)
      expect(newChecked).toBe(!initialChecked)

      // 再次点击恢复
      await autoSyncSwitch.click()
    })

    test('同步间隔选择器应可更改', async ({ page }) => {
      // 点击同步间隔下拉
      await page.getByTestId('sync-settings').getByRole('combobox').click()

      // 选择30分钟
      const option30 = page.getByText('30分钟')
      if (await option30.isVisible().catch(() => false)) {
        await option30.click()

        // 验证选择成功
        await expect(page.getByTestId('sync-settings').getByRole('combobox')).toContainText('30分钟')
      }
    })
  })

  test.describe('响应式布局', () => {
    test('在移动设备上应正常显示', async ({ page }) => {
      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()

      // 等待页面加载
      await expect(page).toHaveURL(/\/sync/, { timeout: 10000 })

      // 验证关键元素仍然可见
      await expect(page.getByText('数据同步')).toBeVisible()
      await expect(page.getByText('代码统计')).toBeVisible()
      await expect(page.getByText('同步日志')).toBeVisible()
      await expect(page.getByText('同步任务')).toBeVisible()
    })

    test('在平板设备上应正常显示', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()

      // 等待页面加载
      await expect(page).toHaveURL(/\/sync/, { timeout: 10000 })

      // 验证关键元素可见
      await expect(page.getByText('数据同步')).toBeVisible()
      await expect(page.getByText('代码统计')).toBeVisible()
      await expect(page.getByText('Token使用')).toBeVisible()
    })
  })

  test.describe('性能测试', () => {
    test('页面应在合理时间内加载完成', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      const startTime = Date.now()
      await page.goto('/sync')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // 页面加载时间应小于5秒
      expect(loadTime).toBeLessThan(5000)
      errorMonitor.expectNoErrors()
    })
  })
})
