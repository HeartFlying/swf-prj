# 测试反模式规则 - 必须避免

> 记录项目中实际发生的问题，作为后续开发的警示

## 反模式 1：Mock 数据脱离真实后端格式

### ❌ 错误示例
```typescript
// 测试直接给转换后的数据，没有反映后端实际返回
const mockResponse = {
  accessToken: 'new_access_token',
  refreshToken: 'new_refresh_token',
  tokenType: 'bearer',
  expiresIn: 3600,
}
```

### 🔴 问题后果
- 后端实际只返回 `{access_token, token_type}`
- 前端代码期望 `refreshToken` 字段不存在
- 生产环境出现 `undefined` 错误

### ✅ 正确做法
```typescript
// 明确标注后端返回格式和转换过程
// Backend returns: { access_token, token_type }
// After camelcaseKeys: { accessToken, tokenType }
const mockResponse = {
  accessToken: 'new_access_token',
  tokenType: 'bearer',
}
```

---

## 反模式 2：错误处理阻断错误冒泡

### ❌ 错误示例
```typescript
const fetchCurrentUser = async (): Promise<void> => {
  try {
    const response = await http.get<User>('auth/me')
    user.value = response
  } catch {
    clearTokens() // ❌ 这里清除了 token！
  }
}
```

### 🔴 问题后果
- 请求拦截器需要处理 401 并刷新 token
- 但 catch 块先清除了 token
- 导致刷新逻辑无法执行，用户被强制登出

### ✅ 正确做法
```typescript
const fetchCurrentUser = async (): Promise<void> => {
  const response = await http.get<User>('auth/me')
  user.value = response
  // 让错误冒泡给请求拦截器处理
}
```

---

## 反模式 3：Store 职责混淆

### ❌ 错误示例
```typescript
// Sidebar.vue
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()

// 模板中使用
{{ userStore.user?.username }}
```

### 🔴 问题后果
- 登录时只设置了 `authStore.user`
- `userStore.user` 始终为 null
- 页面显示默认值"用户"而不是实际用户名

### ✅ 正确做法
```typescript
// Sidebar.vue
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()

// 模板中使用
{{ authStore.user?.username }}
```

---

## 反模式 4：字段名大小写不一致

### ❌ 错误示例
```typescript
// 后端返回 snake_case
{ access_token: 'xxx' }

// 前端类型声明期望 snake_case
interface Response {
  access_token: string  // ❌ 但拦截器已转为 camelCase
}

// 实际代码中使用
response.access_token  // undefined！
```

### 🔴 问题后果
- HTTP 拦截器自动转换 camelCase/snake_case
- 类型声明与实际数据格式不匹配
- TypeScript 编译通过但运行时报错

### ✅ 正确做法
```typescript
// 类型声明与拦截器转换后的格式一致
interface Response {
  accessToken: string  // ✅ camelCase
}

// 代码中使用 camelCase
response.accessToken
```

---

## 反模式 5：缺少组件级别的 UI 测试

### ❌ 错误示例
- 只测试了 Store 逻辑
- 没有测试 Sidebar 组件显示
- 没有验证登录后 UI 更新

### 🔴 问题后果
- Store 数据正确但 UI 显示错误
- 用户看到"用户"而不是实际用户名
- 角色显示为"开发者"而不是"admin"

### ✅ 正确做法
```typescript
// Sidebar.spec.ts
it('should display username from authStore', () => {
  const store = useAuthStore()
  store.user = { username: 'admin', role: { name: 'admin' } }
  
  const wrapper = mount(Sidebar)
  expect(wrapper.find('.user-name').text()).toBe('admin')
  expect(wrapper.find('.user-role').text()).toBe('admin')
})
```

---

## 反模式 6：缺少端到端流程测试

### ❌ 错误示例
- 单元测试覆盖各个函数
- 但没有测试完整登录流程
- 没有验证登录后的页面跳转和显示

### 🔴 问题后果
- 各个组件单独工作正常
- 但整合后出现流程中断
- Token 刷新后页面仍跳转到登录页

### ✅ 正确做法
```typescript
// login-flow.spec.ts (E2E)
test('admin 用户登录后应正确显示用户名和角色', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('.user-name')).toHaveText('admin')
  await expect(page.locator('.user-role')).toHaveText('admin')
})
```

---

## 反模式 7：测试没有覆盖边界条件

### ❌ 错误示例
```typescript
it('should refresh token', async () => {
  store.setTokens('old', 'refresh')
  vi.mocked(http.post).mockResolvedValue({ accessToken: 'new' })
  
  await store.refreshAccessToken()
  
  expect(store.token).toBe('new')
})
```

### 🔴 问题后果
- 没有测试 refresh token 缺失的情况
- 没有测试后端返回 401 的情况
- 没有测试网络错误的情况

### ✅ 正确做法
```typescript
it('should throw error when refresh token is missing', async () => {
  store.clearTokens()
  await expect(store.refreshAccessToken()).rejects.toThrow('No refresh token')
})

it('should throw error when refresh request fails', async () => {
  store.setTokens('old', 'refresh')
  vi.mocked(http.post).mockRejectedValue(new Error('Refresh failed'))
  await expect(store.refreshAccessToken()).rejects.toThrow('Refresh failed')
})
```

---

## 检查清单

在提交代码前，检查是否避免了以上反模式：

- [ ] Mock 数据是否反映了后端真实响应格式？
- [ ] 错误处理是否允许错误冒泡给上层处理？
- [ ] 使用的 Store 是否正确（authStore vs userStore）？
- [ ] 字段名是否与 HTTP 拦截器转换后的格式一致？
- [ ] 是否添加了组件级别的 UI 测试？
- [ ] 是否添加了端到端流程测试？
- [ ] 是否覆盖了边界条件和错误场景？
