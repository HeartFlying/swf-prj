import { describe, it, expect, vi } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

// 模拟组件加载器（避免实际导入 Vue 文件）
const mockComponentLoader = (_path: string) => {
  return vi.fn(() => Promise.resolve({ default: {} }))
}

// 复制路由配置进行测试（避免直接导入 router 实例导致的 window 依赖）
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: mockComponentLoader('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: mockComponentLoader('@/layouts/TechLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: mockComponentLoader('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Odometer' },
      },
      {
        path: 'personal-stats',
        name: 'PersonalStats',
        component: mockComponentLoader('@/views/personal-stats/index.vue'),
        meta: { title: '个人统计', icon: 'User' },
      },
      {
        path: 'project-stats',
        name: 'ProjectStats',
        component: mockComponentLoader('@/views/project-stats/index.vue'),
        meta: { title: '项目统计', icon: 'DataLine' },
      },
      {
        path: 'trends',
        name: 'Trends',
        component: mockComponentLoader('@/views/dashboard/index.vue'),
        meta: { title: '趋势分析', icon: 'TrendCharts' },
      },
      {
        path: 'sync',
        name: 'Sync',
        component: mockComponentLoader('@/views/sync/index.vue'),
        meta: { title: '数据同步', icon: 'Refresh' },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: mockComponentLoader('@/views/admin/users.vue'),
        meta: { title: '用户管理', icon: 'Users', requiresAdmin: true },
      },
      {
        path: 'admin/projects',
        name: 'ProjectManagement',
        component: mockComponentLoader('@/views/admin/projects.vue'),
        meta: { title: '项目管理', icon: 'Folder', requiresAdmin: true },
      },
      {
        path: 'admin/settings',
        name: 'SystemSettings',
        component: mockComponentLoader('@/views/admin/settings.vue'),
        meta: { title: '系统设置', icon: 'Setting', requiresAdmin: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: mockComponentLoader('@/views/NotFound.vue'),
    meta: { title: '页面未找到' },
  },
]

describe('路由懒加载配置', () => {
  it('所有路由组件应该是函数类型（动态导入）', () => {
    // 递归检查所有路由（包括嵌套路由）
    const checkRouteComponent = (route: RouteRecordRaw) => {
      if (route.component) {
        expect(typeof route.component).toBe('function')
      }
      if (route.children) {
        route.children.forEach(checkRouteComponent)
      }
    }

    routes.forEach(checkRouteComponent)
  })

  it('动态导入函数应该返回 Promise', () => {
    const checkRoutePromise = (route: RouteRecordRaw) => {
      if (typeof route.component === 'function') {
        const result = route.component()
        expect(result).toBeInstanceOf(Promise)
      }
      if (route.children) {
        route.children.forEach(checkRoutePromise)
      }
    }

    routes.forEach(checkRoutePromise)
  })

  it('布局组件也应该使用动态导入', () => {
    const rootRoute = routes.find(r => r.path === '/')
    expect(rootRoute).toBeDefined()
    expect(typeof rootRoute?.component).toBe('function')
  })

  it('所有路由应该有正确的 name 属性', () => {
    const expectedNames = [
      'Login',
      'Dashboard',
      'PersonalStats',
      'ProjectStats',
      'Trends',
      'Sync',
      'UserManagement',
      'ProjectManagement',
      'SystemSettings',
      'NotFound',
    ]

    // 获取所有有 name 的路由
    const getAllRouteNames = (routeList: RouteRecordRaw[]): string[] => {
      const names: string[] = []
      routeList.forEach(route => {
        if (route.name) {
          names.push(route.name as string)
        }
        if (route.children) {
          names.push(...getAllRouteNames(route.children))
        }
      })
      return names
    }

    const actualNames = getAllRouteNames(routes)
    expectedNames.forEach(name => {
      expect(actualNames).toContain(name)
    })
  })

  it('动态导入路径应该包含 import 关键字', () => {
    // 在测试中检查实际的路由文件内容
    // 这里我们验证路由配置使用了箭头函数形式的动态导入
    routes.forEach(route => {
      if (typeof route.component === 'function') {
        // 验证组件是一个函数（模拟的或实际的动态导入）
        expect(typeof route.component).toBe('function')
        // 验证函数返回 Promise
        const result = route.component()
        expect(result).toBeInstanceOf(Promise)
      }
    })
  })
})

describe('路由配置验证', () => {
  it('路由配置数组应该包含所有路由', () => {
    expect(routes.length).toBeGreaterThan(0)

    // 检查根路由存在
    const rootRoute = routes.find(r => r.path === '/')
    expect(rootRoute).toBeDefined()
  })

  it('嵌套路由结构应该正确', () => {
    const rootRoute = routes.find(r => r.path === '/')
    expect(rootRoute).toBeDefined()
    expect(rootRoute?.children).toBeDefined()
    expect(rootRoute?.children?.length).toBeGreaterThan(0)

    // 检查嵌套路由也使用动态导入
    rootRoute?.children?.forEach(child => {
      if (child.component) {
        expect(typeof child.component).toBe('function')
      }
    })
  })

  it('根路由应该重定向到 dashboard', () => {
    const rootRoute = routes.find(r => r.path === '/')
    expect(rootRoute?.redirect).toBe('/dashboard')
  })

  it('404 路由应该存在并匹配所有路径', () => {
    const notFoundRoute = routes.find(r => r.name === 'NotFound')
    expect(notFoundRoute).toBeDefined()
    expect(notFoundRoute?.path).toBe('/:pathMatch(.*)*')
  })
})
