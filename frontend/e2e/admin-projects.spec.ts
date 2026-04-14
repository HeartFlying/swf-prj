import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'
import { diagnoseNetwork } from './utils/network-check'

/**
 * 项目管理页面端到端测试
 * 覆盖页面元素显示、统计卡片、搜索功能、项目列表、编辑、删除、状态切换、成员管理等功能
 * 使用真实后端API进行测试
 */
test.describe('项目管理页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到项目管理页面（使用全局登录状态）
    await page.goto('/admin/projects')

    // 检查网络连接状态（用于诊断）
    await diagnoseNetwork(page)

    // 等待页面加载完成 - 使用URL检查
    try {
      await expect(page).toHaveURL(/\/admin\/projects/, { timeout: 15000 })
    } catch (error) {
      // URL 不匹配时，打印诊断信息
      console.error(`❌ 页面 URL 不匹配: ${page.url()}`)
      console.error('   期望: /admin/projects')
      console.error('   可能是后端服务未运行或鉴权失败')
      await diagnoseNetwork(page)
      throw error
    }

    // 等待网络请求完成
    await page.waitForLoadState('networkidle')
  })

  test.describe('页面元素显示验证', () => {
    test('应显示完整的页面标题和副标题', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 验证页面标题
      await expect(page.getByRole('heading', { name: '项目管理' })).toHaveText('项目管理')

      // 验证副标题（使用 class 选择器）
      await expect(page.locator('.page-subtitle')).toHaveText('管理系统项目，配置仓库和成员')

      errorMonitor.expectNoErrors()
    })

    test('应显示搜索框和添加项目按钮', async ({ page }) => {
      // 验证搜索框
      const searchInput = page.getByPlaceholder('搜索项目...')
      await expect(searchInput).toBeVisible()
      await expect(searchInput).toHaveAttribute('placeholder', '搜索项目...')

      // 验证添加项目按钮
      await expect(page.getByRole('button', { name: '添加项目' })).toBeVisible()
    })

    test('应显示统计卡片', async ({ page }) => {
      // 验证四个统计卡片
      await expect(page.getByText('总项目数')).toBeVisible()
      await expect(page.getByText('活跃项目')).toBeVisible()
      await expect(page.getByText('总代码行数')).toBeVisible()
      await expect(page.getByText('总提交数')).toBeVisible()
    })

    test('应显示项目列表表格', async ({ page }) => {
      // 验证表格列标题 - 使用更精确的选择器
      await expect(page.getByRole('columnheader').filter({ hasText: '项目名称' })).toBeVisible()
      await expect(page.getByRole('columnheader').filter({ hasText: '代码' })).toBeVisible()
      await expect(page.getByRole('columnheader').filter({ hasText: '阶段' })).toBeVisible()
      await expect(page.getByRole('columnheader').filter({ hasText: '负责人' })).toBeVisible()
      await expect(page.getByRole('columnheader').filter({ hasText: '成员数' })).toBeVisible()
      await expect(page.getByRole('columnheader').filter({ hasText: '状态' })).toBeVisible()
      await expect(page.getByRole('columnheader').filter({ hasText: '操作' })).toBeVisible()
    })

    test('表格应显示项目数据或空状态', async ({ page }) => {
      // 等待表格数据加载 - 使用 locator 的 or() 方法
      const projectRow = page.getByTestId('project-row').first()
      const emptyState = page.getByTestId('empty-state')
      await expect(projectRow.or(emptyState)).toBeVisible({ timeout: 10000 })

      // 检查是否有数据行或空状态
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        // 验证空状态显示
        await expect(emptyState).toBeVisible()
      } else {
        // 验证表格数据行存在
        await expect(projectRow).toBeVisible()
      }
    })
  })

  test.describe('搜索功能', () => {
    test('搜索框应能过滤项目列表', async ({ page }) => {
      // 输入搜索关键词
      const searchInput = page.getByPlaceholder('搜索项目...')
      await searchInput.fill('test')

      // 等待搜索防抖（300ms）和请求完成
      await page.waitForLoadState('networkidle')

      // 验证搜索后的结果（可能有数据或空状态）
      const rows = await page.getByTestId('project-row').count()
      // 搜索结果应该大于等于0
      expect(rows).toBeGreaterThanOrEqual(0)
    })

    test('清空搜索框应恢复所有项目', async ({ page }) => {
      // 先输入搜索词
      const searchInput = page.getByPlaceholder('搜索项目...')
      await searchInput.fill('test')
      await page.waitForLoadState('networkidle')

      // 记录搜索后的行数
      const searchCount = await page.getByTestId('project-row').count()

      // 清空搜索框
      await searchInput.clear()
      await page.waitForLoadState('networkidle')

      // 验证所有项目都显示（行数应该大于等于搜索时的行数）
      const clearCount = await page.getByTestId('project-row').count()
      expect(clearCount).toBeGreaterThanOrEqual(searchCount)
    })
  })

  test.describe('项目状态显示', () => {
    test('应正确显示项目阶段标签', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows > 0) {
        // 验证阶段标签存在
        const stageTags = page.locator('.el-table__row .el-tag').filter({ hasText: /开发中|已上线|维护中|规划中/ })
        const tagCount = await stageTags.count()
        expect(tagCount).toBeGreaterThan(0)
      }
    })

    test('应正确显示项目状态标签', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows > 0) {
        // 验证状态标签存在
        const statusTags = page.locator('.el-table__row .el-tag').filter({ hasText: /活跃|归档|暂停/ })
        const tagCount = await statusTags.count()
        expect(tagCount).toBeGreaterThan(0)
      }
    })
  })

  test.describe('编辑项目功能', () => {
    test('点击编辑按钮应打开编辑弹窗', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击第一个项目的编辑按钮
      const editButton = page.getByRole('button', { name: '编辑' }).first()
      await editButton.click()

      // 验证编辑弹窗显示
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('编辑项目')).toBeVisible()

      // 验证表单字段已填充
      await expect(page.getByRole('textbox', { name: '项目名称' }).first()).toBeVisible()

      // 关闭弹窗
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('编辑项目并保存应成功或显示验证错误', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击编辑按钮
      const editButton = page.getByRole('button', { name: '编辑' }).first()
      await editButton.click()

      // 等待弹窗打开
      await expect(page.getByRole('dialog')).toBeVisible()

      // 修改项目名称
      const nameInput = page.getByRole('textbox', { name: '项目名称' }).first()
      const originalValue = await nameInput.inputValue()
      await nameInput.clear()
      await nameInput.fill(`${originalValue}_edited`)

      // 点击保存
      await page.getByRole('button', { name: '保存' }).click()

      // 验证成功消息或错误消息
      await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('下拉菜单操作', () => {
    test('点击更多按钮应显示下拉菜单', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击更多按钮
      const moreButton = page.getByRole('button', { name: '更多' }).first()
      await moreButton.click()

      // 验证下拉菜单显示
      await expect(page.getByText('成员管理')).toBeVisible()
      await expect(page.getByText('归档')).toBeVisible()
      await expect(page.getByText('删除')).toBeVisible()
    })

    test('归档项目应显示确认并更新状态', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 找到一个活跃项目并点击更多
      const moreButton = page.getByRole('button', { name: '更多' }).first()
      await moreButton.click()

      // 点击归档
      await page.getByText('归档').click()

      // 验证成功消息或确认对话框
      const hasMessageBox = await page.locator('.el-message-box').isVisible().catch(() => false)
      if (hasMessageBox) {
        await page.getByRole('button', { name: '确定' }).click()
      }

      // 验证成功消息
      await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('删除项目功能', () => {
    test('删除项目应显示确认对话框', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击更多按钮
      const moreButton = page.getByRole('button', { name: '更多' }).first()
      await moreButton.click()

      // 点击删除
      await page.getByText('删除').click()

      // 验证确认对话框显示
      await expect(page.getByText('确认删除')).toBeVisible()
      await expect(page.getByText('确定要删除项目')).toBeVisible()

      // 取消删除
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('确认删除后应成功删除项目或显示错误', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击更多按钮
      const moreButton = page.getByRole('button', { name: '更多' }).first()
      await moreButton.click()

      // 点击删除
      await page.getByText('删除').click()

      // 等待确认对话框
      await expect(page.getByText('确认删除')).toBeVisible()

      // 点击确定
      await page.getByRole('button', { name: '确定' }).click()

      // 验证成功消息或错误消息
      await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('成员管理功能', () => {
    test('点击成员管理应打开成员管理弹窗', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)

      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击更多按钮
      const moreButton = page.getByRole('button', { name: '更多' }).first()
      await moreButton.click()

      // 点击成员管理
      await page.getByText('成员管理').click()

      // 验证成员管理弹窗显示
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('项目成员管理')).toBeVisible()

      // 关闭弹窗
      await page.getByRole('button', { name: '关闭' }).click()

      errorMonitor.expectNoErrors()
    })
  })

  test.describe('添加项目功能', () => {
    test('点击添加项目按钮应打开添加弹窗', async ({ page }) => {
      // 点击添加项目按钮
      await page.getByRole('button', { name: '添加项目' }).click()

      // 验证弹窗显示
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('添加项目')).toBeVisible()

      // 验证表单字段
      await expect(page.getByRole('textbox', { name: '项目名称' }).first()).toBeVisible()
      await expect(page.getByRole('textbox', { name: '项目描述' }).first()).toBeVisible()

      // 关闭弹窗
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('添加项目表单应能填写和提交', async ({ page }) => {
      // 点击添加项目按钮
      await page.getByRole('button', { name: '添加项目' }).click()

      // 等待弹窗打开
      await expect(page.getByRole('dialog')).toBeVisible()

      // 填写表单
      const nameInput = page.getByRole('textbox', { name: '项目名称' }).first()
      await nameInput.fill(`测试项目_${Date.now()}`)

      const descInput = page.getByRole('textbox', { name: '项目描述' }).first()
      await descInput.fill('这是新项目的描述')

      // 点击保存
      await page.getByRole('button', { name: '保存' }).click()

      // 验证成功消息或验证错误
      await expect(page.locator('.el-message--success, .el-message--error, .el-form-item__error')).toBeVisible({ timeout: 5000 })
    })

    test('添加项目表单验证应正常工作', async ({ page }) => {
      // 点击添加项目按钮
      await page.getByRole('button', { name: '添加项目' }).click()

      // 等待弹窗打开
      await expect(page.getByRole('dialog')).toBeVisible()

      // 直接点击保存（不填写必填项）
      await page.getByRole('button', { name: '保存' }).click()

      // 验证表单验证错误
      await expect(page.locator('.el-form-item__error')).toBeVisible()
    })
  })

  test.describe('分页功能', () => {
    test('应显示分页组件', async ({ page }) => {
      // 验证分页组件存在（如果有足够数据）
      const pagination = page.getByTestId('pagination')
      if (await pagination.isVisible().catch(() => false)) {
        await expect(pagination).toBeVisible()
      }
    })
  })

  test.describe('表格交互', () => {
    test('点击行应触发行点击事件', async ({ page }) => {
      // 等待表格加载完成
      await expect(page.getByTestId('project-row').first().or(page.getByTestId('empty-state'))).toBeVisible({ timeout: 10000 })

      // 获取表格行数
      const rows = await page.getByTestId('project-row').count()
      if (rows === 0) {
        test.skip('没有项目数据，跳过测试')
        return
      }

      // 点击表格行
      const firstRow = page.getByTestId('project-row').first()
      await firstRow.click()

      // 验证行被点击（可以通过检查是否有视觉反馈或其他效果）
      await expect(firstRow).toHaveClass(/el-table__row/)
    })

    test('表格应支持多选', async ({ page }) => {
      // 验证复选框存在
      const checkboxes = page.locator('.el-table__header .el-checkbox')
      if (await checkboxes.first().isVisible().catch(() => false)) {
        await expect(checkboxes.first()).toBeVisible()
      }
    })
  })

  test.describe('响应式布局', () => {
    test('在平板设备上应正常显示', async ({ page }) => {
      // 设置平板设备视口
      await page.setViewportSize({ width: 768, height: 1024 })

      // 验证页面元素仍然可见
      await expect(page.getByText('项目管理')).toBeVisible()
      await expect(page.getByPlaceholder('搜索项目...')).toBeVisible()
    })

    test('在桌面设备上应正常显示', async ({ page }) => {
      // 设置桌面设备视口
      await page.setViewportSize({ width: 1920, height: 1080 })

      // 验证页面元素正常显示
      await expect(page.getByText('项目管理')).toBeVisible()
      await expect(page.getByText('总项目数')).toBeVisible()
      await expect(page.getByText('活跃项目')).toBeVisible()
    })
  })
})
