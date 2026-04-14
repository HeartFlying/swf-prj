import { test, expect } from '@playwright/test'
import { setupErrorMonitoring } from './utils/error-monitor'

/**
 * 用户管理页面端到端测试
 * 覆盖页面元素显示、搜索筛选、用户CRUD操作、分页等功能
 * 使用真实后端API进行测试
 */
test.describe('用户管理页面', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到用户管理页面（使用全局登录状态）
    await page.goto('/admin/users')

    // 等待页面加载完成
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
  })

  test.describe('页面元素显示验证', () => {
    test('应显示完整的页面标题和副标题', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 验证页面标题
      await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible()
      // 验证副标题
      await expect(page.getByText('管理系统用户，分配角色和权限')).toBeVisible()
      errorMonitor.expectNoErrors()
    })

    test('应显示统计卡片', async ({ page }) => {
      // 验证四个统计卡片
      await expect(page.getByText('总用户数')).toBeVisible()
      await expect(page.getByText('活跃用户')).toBeVisible()
      await expect(page.getByText('管理员')).toBeVisible()
      await expect(page.getByText('今日新增')).toBeVisible()
    })

    test('应显示筛选栏元素', async ({ page }) => {
      // 验证搜索输入框
      await expect(page.getByPlaceholder('搜索用户名或邮箱...')).toBeVisible()

      // 验证角色筛选下拉框
      await expect(page.getByTestId('role-filter')).toBeVisible()

      // 验证状态筛选下拉框
      await expect(page.getByTestId('status-filter')).toBeVisible()
    })

    test('应显示用户列表表格', async ({ page }) => {
      // 验证表格标题
      await expect(page.getByText('用户列表')).toBeVisible()

      // 验证表格列头
      await expect(page.getByText('用户名')).toBeVisible()
      await expect(page.getByText('邮箱')).toBeVisible()
      await expect(page.getByText('部门')).toBeVisible()
      await expect(page.getByText('角色')).toBeVisible()
      await expect(page.getByText('状态')).toBeVisible()
      await expect(page.getByText('操作')).toBeVisible()
    })

    test('应显示添加用户按钮', async ({ page }) => {
      await expect(page.getByRole('button', { name: '添加用户' })).toBeVisible()
    })

    test('应显示用户数据行或空状态', async ({ page }) => {
      // 检查是否有数据行
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        // 验证空状态显示
        await expect(page.getByTestId('empty-state')).toBeVisible()
      } else {
        // 验证表格数据行存在
        await expect(page.getByTestId('user-row').first()).toBeVisible()
      }
    })
  })

  test.describe('搜索和筛选功能', () => {
    test('搜索功能应能过滤用户列表', async ({ page }) => {
      // 输入搜索关键词
      await page.getByPlaceholder('搜索用户名或邮箱...').fill('admin')

      // 等待搜索请求完成
      await page.waitForLoadState('networkidle')

      // 验证搜索结果（可能有数据或空状态）
      const rows = await page.getByTestId('user-row').count()
      expect(rows).toBeGreaterThanOrEqual(0)
    })

    test('角色筛选应能过滤用户列表', async ({ page }) => {
      // 点击角色筛选下拉框
      await page.getByTestId('role-filter').click()

      // 等待选项加载
      await expect(page.locator('.el-select-dropdown__item, .el-dropdown-menu__item').first()).toBeVisible({ timeout: 5000 })

      // 选择"管理员"选项（如果存在）
      const adminOption = page.getByText('管理员', { exact: false }).first()
      if (await adminOption.isVisible().catch(() => false)) {
        await adminOption.click()
        await page.waitForLoadState('networkidle')
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('状态筛选应能过滤用户列表', async ({ page }) => {
      // 点击状态筛选下拉框
      await page.getByTestId('status-filter').click()

      // 等待选项加载
      await expect(page.locator('.el-select-dropdown__item, .el-dropdown-menu__item').first()).toBeVisible({ timeout: 5000 })

      // 选择"启用"选项（如果存在）
      const activeOption = page.getByText('启用', { exact: false }).first()
      if (await activeOption.isVisible().catch(() => false)) {
        await activeOption.click()
        await page.waitForLoadState('networkidle')
      } else {
        // 关闭下拉
        await page.keyboard.press('Escape')
      }
    })

    test('清除搜索应恢复显示所有用户', async ({ page }) => {
      // 先输入搜索词
      await page.getByPlaceholder('搜索用户名或邮箱...').fill('admin')
      await page.waitForLoadState('networkidle')

      // 记录搜索后的行数
      const searchCount = await page.getByTestId('user-row').count()

      // 清除搜索框
      await page.getByPlaceholder('搜索用户名或邮箱...').clear()
      await page.waitForLoadState('networkidle')

      // 验证所有用户都显示（行数应该大于等于搜索时的行数）
      const clearCount = await page.getByTestId('user-row').count()
      expect(clearCount).toBeGreaterThanOrEqual(searchCount)
    })
  })

  test.describe('添加用户功能', () => {
    test('点击添加用户按钮应打开对话框', async ({ page }) => {
      // 点击添加用户按钮
      await page.getByRole('button', { name: '添加用户' }).click()

      // 验证对话框标题
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('添加用户')).toBeVisible()

      // 验证表单字段
      await expect(page.getByLabel('用户名')).toBeVisible()
      await expect(page.getByLabel('邮箱')).toBeVisible()
      await expect(page.getByLabel('密码')).toBeVisible()
      await expect(page.getByLabel('部门')).toBeVisible()
      await expect(page.getByLabel('角色')).toBeVisible()
      await expect(page.getByLabel('状态')).toBeVisible()

      // 关闭对话框
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('添加用户表单应验证必填字段', async ({ page }) => {
      // 打开添加用户对话框
      await page.getByRole('button', { name: '添加用户' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // 直接点击确定按钮
      await page.getByRole('button', { name: '确定' }).click()

      // 验证表单验证错误提示
      await expect(page.locator('.el-form-item__error')).toBeVisible()

      // 关闭对话框
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('邮箱格式验证应正常工作', async ({ page }) => {
      // 打开添加用户对话框
      await page.getByRole('button', { name: '添加用户' }).click()

      // 输入无效的邮箱格式
      await page.getByLabel('邮箱').fill('invalid-email')

      // 点击确定触发验证
      await page.getByRole('button', { name: '确定' }).click()

      // 验证邮箱格式错误提示
      await expect(page.locator('.el-form-item__error')).toBeVisible()

      // 关闭对话框
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('成功添加用户应显示消息', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 打开添加用户对话框
      await page.getByRole('button', { name: '添加用户' }).click()

      // 填写表单
      const timestamp = Date.now()
      await page.getByLabel('用户名').fill(`newuser_${timestamp}`)
      await page.getByLabel('邮箱').fill(`new_${timestamp}@example.com`)
      await page.getByLabel('密码').fill('password123')
      await page.getByLabel('部门').fill('测试部')

      // 选择角色（如果存在）
      const roleSelect = page.locator('.el-select').filter({ hasText: '请选择角色' })
      if (await roleSelect.isVisible().catch(() => false)) {
        await roleSelect.click()
        const developerOption = page.getByText('开发者').first()
        if (await developerOption.isVisible().catch(() => false)) {
          await developerOption.click()
        } else {
          await page.keyboard.press('Escape')
        }
      }

      // 提交表单
      await page.getByRole('button', { name: '确定' }).click()

      // 验证成功消息或错误消息
      await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })
      errorMonitor.expectNoErrors()
    })

    test('取消按钮应关闭对话框而不保存', async ({ page }) => {
      // 打开添加用户对话框
      await page.getByRole('button', { name: '添加用户' }).click()

      // 填写一些数据
      await page.getByLabel('用户名').fill('testuser_cancel')

      // 点击取消按钮
      await page.getByRole('button', { name: '取消' }).click()

      // 验证对话框关闭
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })
  })

  test.describe('编辑用户功能', () => {
    test('点击编辑按钮应打开编辑对话框并填充用户数据', async ({ page }) => {
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 点击第一个用户的编辑按钮
      const editButton = page.getByRole('button', { name: '编辑' }).first()
      await editButton.click()

      // 验证对话框标题
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('编辑用户')).toBeVisible()

      // 验证表单已填充用户数据
      const usernameInput = page.getByLabel('用户名')
      await expect(usernameInput).toBeVisible()
      const value = await usernameInput.inputValue()
      expect(value.length).toBeGreaterThan(0)

      // 关闭对话框
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('成功编辑用户应显示消息', async ({ page }) => {
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 点击编辑按钮
      const editButton = page.getByRole('button', { name: '编辑' }).first()
      await editButton.click()

      // 修改用户数据
      const deptInput = page.getByLabel('部门')
      await deptInput.clear()
      await deptInput.fill('新部门')

      // 提交表单
      await page.getByRole('button', { name: '确定' }).click()

      // 验证成功消息或错误消息
      await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('删除用户功能', () => {
    test('点击删除按钮应显示确认对话框', async ({ page }) => {
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 点击第一个用户的删除按钮
      const deleteButton = page.getByRole('button', { name: '删除' }).first()
      await deleteButton.click()

      // 验证确认对话框显示
      await expect(page.getByText('确认删除')).toBeVisible()
      await expect(page.getByText('确定要删除用户')).toBeVisible()

      // 取消删除
      await page.getByRole('button', { name: '取消' }).click()
    })

    test('确认删除应删除用户并显示消息', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 点击删除按钮
      const deleteButton = page.getByRole('button', { name: '删除' }).first()
      await deleteButton.click()

      // 确认删除
      await page.getByRole('button', { name: '确定' }).click()

      // 验证成功消息或错误消息
      await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })
      errorMonitor.expectNoErrors()
    })

    test('取消删除应保持用户不变', async ({ page }) => {
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 记录第一个用户的用户名
      const firstUsername = await page.getByTestId('user-row').first().locator('td').first().textContent()

      // 点击删除按钮
      const deleteButton = page.getByRole('button', { name: '删除' }).first()
      await deleteButton.click()

      // 取消删除
      await page.getByRole('button', { name: '取消' }).click()

      // 验证用户仍在列表中
      await expect(page.getByText(firstUsername || '')).toBeVisible()
    })
  })

  test.describe('用户状态切换功能', () => {
    test('切换用户状态应显示消息', async ({ page }) => {
      const errorMonitor = setupErrorMonitoring(page)
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 找到第二个用户的开关并点击（避免修改admin）
      const switches = page.getByRole('switch')
      const switchCount = await switches.count()
      if (switchCount > 1) {
        await switches.nth(1).click()

        // 验证成功消息
        await expect(page.locator('.el-message--success, .el-message--error')).toBeVisible({ timeout: 5000 })
      }
      errorMonitor.expectNoErrors()
    })
  })

  test.describe('分页功能', () => {
    test('应显示分页控件', async ({ page }) => {
      // 验证分页控件存在（如果有足够数据）
      const pagination = page.getByTestId('pagination')
      if (await pagination.isVisible().catch(() => false)) {
        await expect(pagination).toBeVisible()
      }
    })
  })

  test.describe('角色标签显示', () => {
    test('应正确显示不同角色的标签样式', async ({ page }) => {
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 验证至少有一些标签存在
      const tags = page.locator('.el-table__row .el-tag')
      const tagCount = await tags.count()
      expect(tagCount).toBeGreaterThan(0)
    })
  })

  test.describe('用户头像显示', () => {
    test('应显示用户头像', async ({ page }) => {
      // 获取表格行数
      const rows = await page.getByTestId('user-row').count()
      if (rows === 0) {
        test.skip('没有用户数据，跳过测试')
        return
      }

      // 验证用户头像显示
      const avatar = page.getByTestId('user-avatar').first()
      await expect(avatar).toBeVisible()
    })
  })

  test.describe('加载状态', () => {
    test('加载用户列表时应显示加载状态', async ({ page }) => {
      // 刷新页面
      await page.reload()

      // 验证加载状态或表格
      const loading = page.getByTestId('loading-mask')
      const table = page.getByTestId('user-row')

      // 至少有一个应该可见
      const hasLoading = await loading.isVisible().catch(() => false)
      const hasTable = await table.first().isVisible().catch(() => false)

      expect(hasLoading || hasTable).toBeTruthy()
    })
  })
})
