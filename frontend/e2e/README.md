# Playwright 端到端测试

本项目使用 [Playwright](https://playwright.dev/) 进行端到端测试。

## 目录结构

```
e2e/
├── README.md              # 本文档
├── .env.test              # 测试环境变量配置
├── global-setup.ts        # 全局设置 (真实登录并保存状态)
├── playwright.config.ts   # Playwright 配置
├── login.spec.ts          # 登录页面测试 (Mock API)
├── login-real.spec.ts     # 真实后端登录测试
├── dashboard.spec.ts      # 仪表板测试
└── utils/
    └── test-helpers.ts    # 测试辅助函数
```

## 测试类型

### 1. Mock测试 (login.spec.ts)
- 使用 `page.route()` 拦截并模拟API响应
- 不依赖后端服务，可独立运行
- 用于测试前端UI逻辑和交互

### 2. 真实后端测试 (login-real.spec.ts)
- 使用真实的后端API进行测试
- 需要启动完整的服务栈
- 用于验证前后端集成

## 测试用户

真实后端测试使用以下用户（来自 `backend/init_db.py` 和 `backend/app/db/seeds.py`）：

| 用户名 | 密码 | 角色 | 部门 |
|--------|------|------|------|
| admin | password123 | 管理员 | 研发中心 |
| zhangsan | password123 | 开发者 | 研发一部 |
| lisi | password123 | 开发者 | 研发一部 |
| wangwu | password123 | 开发者 | 研发二部 |
| zhaoliu | password123 | 测试人员 | 测试部 |
| pm_zhang | password123 | 项目经理 | 产品部 |

## 快速开始（方案1: 环境检查）

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 方案1: 先验证环境再运行测试（推荐）

#### 方式一：分步执行
```bash
# 检查环境是否就绪
npm run test:e2e:verify

# 如果检查通过，运行测试
npm run test:e2e
```

#### 方式二：自动检查并运行
```bash
# 自动检查环境，通过后运行测试
npm run test:e2e:safe
```

### 3. 运行特定测试

#### Mock测试（无需后端）
```bash
# 只运行Mock测试
npx playwright test login.spec.ts
```

#### 真实后端测试（需要完整服务栈）
```bash
# 运行真实登录测试
npx playwright test login-real.spec.ts

# 强制重新登录（忽略已保存的登录状态）
FORCE_RELOGIN=true npx playwright test login-real.spec.ts
```

### 4. 其他命令

```bash
# 使用 UI 模式运行 (推荐开发时使用)
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report
```

## 编写测试

### 基本测试结构

```typescript
import { test, expect } from '@playwright/test'

test.describe('功能模块', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path')
  })

  test('测试用例描述', async ({ page }) => {
    // 操作
    await page.getByRole('button').click()

    // 断言
    await expect(page.getByText('结果')).toBeVisible()
  })
})
```

### 常用选择器

```typescript
// 通过 placeholder
page.getByPlaceholder('请输入用户名')

// 通过 role
page.getByRole('button', { name: '登录' })

// 通过文本
page.getByText('仪表盘')

// CSS 选择器
page.locator('.el-table__row')

// 组合选择器
page.locator('.el-select').filter({ hasText: '选择项目' })
```

### 辅助函数

```typescript
import { login, waitForLoading, expectToast } from './utils/test-helpers'

// 登录
test.beforeEach(async ({ page }) => {
  await login(page, 'admin', 'password')
})

// 等待加载
await waitForLoading(page)

// 验证 Toast
await expectToast(page, '操作成功')
```

## 最佳实践

1. **使用语义化选择器**: 优先使用 `getByRole`, `getByText` 而非 CSS 选择器
2. **避免硬编码等待**: 使用 `expect().toBeVisible()` 代替 `page.waitForTimeout()`
3. **保持测试独立**: 每个测试应该可以独立运行
4. **使用 beforeEach**: 共享的测试准备逻辑放在 `beforeEach` 中

## 配置说明

### 环境变量

```bash
# 指定基础 URL
BASE_URL=http://localhost:3000 npm run test:e2e

# CI 模式
CI=true npm run test:e2e
```

### 浏览器配置

在 `playwright.config.ts` 中可以配置多个浏览器:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

## 故障排除

### "鉴权问题" / 页面跳转到登录页

**现象**: 测试期望 URL 为 `/admin/projects`，但实际为 `/login`

**根本原因**: 后端服务未运行，导致 Router Guard 的 `fetchCurrentUser()` 失败

**问题链**:
1. Playwright webServer 配置中的后端服务未启动
2. E2E 测试打开 `/admin/projects`
3. Router Guard 检测到 `authStore.user` 为空
4. Router Guard 调用 `fetchCurrentUser()` → 请求后端 `/api/v1/auth/me`
5. 后端不可达 → fetch 失败
6. Router Guard 捕获异常并重定向到 `/login`

**解决方案**:
```bash
# 1. 检查环境是否就绪
npm run test:e2e:verify

# 2. 根据提示启动缺失的服务

# 3. 重新运行测试
npm run test:e2e
```

### 测试失败常见原因

1. **元素未找到**: 检查选择器是否正确，页面是否已加载
2. **超时**: 增加 `timeout` 或检查网络请求
3. **状态未保存**: 检查 `global-setup.ts` 是否正确执行
4. **鉴权问题**: 后端服务未运行，使用 `npm run test:e2e:verify` 检查

### 调试技巧

```bash
# 使用 UI 模式
npx playwright test --ui

# 单文件调试
npx playwright test login.spec.ts --debug

# 生成代码
npx playwright codegen http://localhost:5173
```
