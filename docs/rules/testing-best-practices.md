# 测试最佳实践 - 建议操作指南

> 基于项目经验总结的测试策略，用于对比和参考

## 1. 分层测试策略

### 测试金字塔
```
    /\
   /  \  E2E 测试 (少而精)
  /____\
 /      \  集成测试 (中等)
/________\
/          \  单元测试 (多而全)
/____________\
```

### 各层职责

| 层级 | 职责 | 数量 | 运行速度 |
|------|------|------|----------|
| 单元测试 | 测试单个函数/组件 | 多 (70%) | 快 (<1s) |
| 集成测试 | 测试模块协作 | 中 (20%) | 中 (<10s) |
| E2E 测试 | 测试完整用户流程 | 少 (10%) | 慢 (<1min) |

---

## 2. 单元测试最佳实践

### 2.1 测试单个函数行为
```typescript
describe('refreshAccessToken', () => {
  it('should correctly handle camelCase response', async () => {
    const store = useAuthStore()
    store.setTokens('old', 'refresh')
    
    // 明确标注后端返回格式
    // Backend returns: { access_token, token_type }
    // After camelcaseKeys: { accessToken, tokenType }
    vi.mocked(http.post).mockResolvedValue({
      accessToken: 'new_token',
      tokenType: 'bearer',
    })
    
    await store.refreshAccessToken()
    
    expect(store.token).toBe('new_token')
  })
})
```

### 2.2 测试边界条件
```typescript
it('should throw error when refresh token is missing', async () => {
  store.clearTokens()
  await expect(store.refreshAccessToken())
    .rejects.toThrow('No refresh token')
})

it('should throw error when request fails', async () => {
  vi.mocked(http.post).mockRejectedValue(new Error('Network error'))
  await expect(store.refreshAccessToken())
    .rejects.toThrow('Network error')
})
```

### 2.3 测试状态变化
```typescript
it('should update localStorage when token changes', () => {
  store.setTokens('access', 'refresh')
  
  expect(localStorage.getItem('token')).toBe('access')
  expect(localStorage.getItem('refreshToken')).toBe('refresh')
})
```

---

## 3. 集成测试最佳实践

### 3.1 测试完整流程
```typescript
describe('Login Flow', () => {
  it('should complete full login flow', async () => {
    // 1. 初始状态
    expect(store.isAuthenticated).toBe(false)
    
    // 2. 执行登录
    vi.mocked(http.post).mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: { username: 'admin', role: { name: 'admin' } },
    })
    await store.login({ username: 'admin', password: 'pass' })
    
    // 3. 验证状态变化
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.username).toBe('admin')
    expect(localStorage.getItem('token')).toBe('token')
  })
})
```

### 3.2 测试模块协作
```typescript
describe('Token Refresh Integration', () => {
  it('should refresh token and retry failed request', async () => {
    // 模拟 401 后刷新成功
    const mockGet = vi.mocked(http.get)
    mockGet.mockRejectedValueOnce(new Error('401'))
    mockGet.mockResolvedValueOnce({ id: 1, username: 'admin' })
    
    vi.mocked(http.post).mockResolvedValue({
      accessToken: 'new_token',
      tokenType: 'bearer',
    })
    
    // 请求应该自动重试
    const result = await http.get('auth/me')
    expect(result).toEqual({ id: 1, username: 'admin' })
  })
})
```

### 3.3 测试错误恢复
```typescript
it('should handle refresh failure gracefully', async () => {
  store.setTokens('expired', 'invalid')
  vi.mocked(http.post).mockRejectedValue(new Error('Invalid token'))
  
  // 应该登出并跳转
  await expect(store.refreshAccessToken()).rejects.toThrow()
  expect(store.isAuthenticated).toBe(false)
})
```

---

## 4. 组件测试最佳实践

### 4.1 测试渲染输出
```typescript
describe('Sidebar', () => {
  it('should display user info correctly', () => {
    const store = useAuthStore()
    store.user = {
      username: 'admin',
      role: { name: 'admin', permissions: ['*'] },
    }
    
    const wrapper = mount(Sidebar, {
      global: { stubs: ['router-link', 'el-icon'] },
    })
    
    expect(wrapper.find('.user-name').text()).toBe('admin')
    expect(wrapper.find('.user-role').text()).toBe('admin')
    expect(wrapper.find('.user-avatar').text()).toBe('AD')
  })
})
```

### 4.2 测试交互
```typescript
it('should call logout when logout button clicked', async () => {
  const logoutSpy = vi.spyOn(store, 'logout')
  const wrapper = mount(Sidebar)
  
  await wrapper.find('.logout-btn').trigger('click')
  
  expect(logoutSpy).toHaveBeenCalled()
})
```

### 4.3 测试不同状态
```typescript
it('should show defaults when no user', () => {
  store.clearTokens()
  const wrapper = mount(Sidebar)
  
  expect(wrapper.find('.user-name').text()).toBe('用户')
  expect(wrapper.find('.user-role').text()).toBe('开发者')
})
```

---

## 5. E2E 测试最佳实践

### 5.1 测试关键用户流程
```typescript
test('complete login flow', async ({ page }) => {
  // 1. 访问登录页
  await page.goto('/login')
  
  // 2. 输入凭证
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'password123')
  
  // 3. 提交
  await page.click('button[type="submit"]')
  
  // 4. 验证跳转
  await expect(page).toHaveURL('/dashboard')
  
  // 5. 验证 UI
  await expect(page.locator('.user-name')).toHaveText('admin')
})
```

### 5.2 测试错误场景
```typescript
test('should show error on invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="username"]', 'admin')
  await page.fill('[name="password"]', 'wrong')
  await page.click('button[type="submit"]')
  
  await expect(page.locator('.el-message--error'))
    .toContainText('用户名或密码错误')
})
```

### 5.3 测试控制台无错误
```typescript
test('should have no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  
  expect(errors).toEqual([])
})
```

---

## 6. 测试数据管理

### 6.1 使用工厂函数
```typescript
// factories/user.ts
export const createUser = (overrides = {}) => ({
  id: 1,
  username: `user_${Date.now()}`,
  email: 'test@example.com',
  role: { name: 'developer', permissions: [] },
  ...overrides,
})

// 使用
const admin = createUser({ username: 'admin', role: { name: 'admin' } })
const developer = createUser({ role: { name: 'developer' } })
```

### 6.2 清理测试数据
```typescript
afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
```

### 6.3 隔离测试状态
```typescript
beforeEach(() => {
  setActivePinia(createPinia())
})
```

---

## 7. Mock 策略

### 7.1 Mock HTTP 请求
```typescript
vi.mock('@/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))
```

### 7.2 Mock 路由
```typescript
vi.mock('vue-router', () => ({
  useRoute: () => ({ path: '/dashboard', params: {} }),
  useRouter: () => ({ push: vi.fn() }),
}))
```

### 7.3 Mock 组件
```typescript
const wrapper = mount(Component, {
  global: {
    stubs: {
      'router-link': true,
      'el-icon': ElIcon,
    },
  },
})
```

---

## 8. 测试命名规范

### 8.1 描述性命名
```typescript
// ✅ 好的命名
describe('Auth Store', () => {
  describe('refreshAccessToken', () => {
    it('should update token when refresh succeeds', () => {})
    it('should throw error when refresh token is missing', () => {})
    it('should clear tokens when refresh fails', () => {})
  })
})

// ❌ 差的命名
describe('test', () => {
  it('works', () => {})
  it('handles error', () => {})
})
```

---

## 9. 持续集成检查清单

在 CI 中运行测试时检查：

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] TypeScript 类型检查通过
- [ ] 代码覆盖率 >= 80%
- [ ] 关键路径 E2E 测试通过
- [ ] 没有 console.error 输出
- [ ] 没有未处理的 Promise 拒绝

---

## 10. 测试维护建议

1. **测试即文档**：测试应该清晰展示功能如何使用
2. **及时修复**：测试失败时立即修复，不要跳过
3. **定期重构**：随着代码演进，重构测试保持清晰
4. **避免过度测试**：不要测试第三方库或 trivial 代码
5. **关注行为**：测试行为而不是实现细节
