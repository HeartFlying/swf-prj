import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '../Sidebar.vue'
import { ElIcon } from 'element-plus'

// Mock vue-router
const mockRoute = { path: '/dashboard' }
const mockRouter = { push: vi.fn() }

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => mockRouter,
}))

describe('Sidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('should display username from authStore', () => {
    const store = useAuthStore()
    store.setTokens('token', 'refresh')
    store.user = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: {
        id: 1,
        name: 'admin',
        description: 'Administrator',
        permissions: ['*'],
      },
    }

    const wrapper = mount(Sidebar, {
      props: { collapsed: false },
      global: {
        stubs: {
          'router-link': RouterLinkStub,
          'el-icon': ElIcon,
        },
        mocks: {
          $route: mockRoute,
        },
      },
    })

    // 验证显示正确的用户名
    expect(wrapper.find('.user-name').text()).toBe('admin')
    // 验证显示正确的角色名
    expect(wrapper.find('.user-role').text()).toBe('admin')
    // 验证头像显示正确
    expect(wrapper.find('.user-avatar').text()).toBe('AD')
  })

  it('should display correct role name for developer', () => {
    const store = useAuthStore()
    store.setTokens('token', 'refresh')
    store.user = {
      id: 2,
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      role: {
        id: 2,
        name: 'developer',
        description: 'Developer',
        permissions: [],
      },
    }

    const wrapper = mount(Sidebar, {
      props: { collapsed: false },
      global: {
        stubs: {
          'router-link': RouterLinkStub,
          'el-icon': ElIcon,
        },
        mocks: {
          $route: mockRoute,
        },
      },
    })

    expect(wrapper.find('.user-name').text()).toBe('zhangsan')
    expect(wrapper.find('.user-role').text()).toBe('developer')
  })

  it('should show defaults when user is not logged in', () => {
    const store = useAuthStore()
    store.clearTokens()

    const wrapper = mount(Sidebar, {
      props: { collapsed: false },
      global: {
        stubs: {
          'router-link': RouterLinkStub,
          'el-icon': ElIcon,
        },
        mocks: {
          $route: mockRoute,
        },
      },
    })

    expect(wrapper.find('.user-name').text()).toBe('用户')
    expect(wrapper.find('.user-role').text()).toBe('开发者')
    expect(wrapper.find('.user-avatar').text()).toBe('U')
  })
})
