import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RouteRecordRaw } from 'vue-router'

// 使用动态导入实现真正的路由懒加载
// 每个组件只在访问对应路由时才加载

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/TechLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Odometer' },
      },
      {
        path: 'personal-stats',
        name: 'PersonalStats',
        component: () => import('@/views/personal-stats/index.vue'),
        meta: { title: '个人统计', icon: 'User' },
      },
      {
        path: 'project-stats',
        name: 'ProjectStats',
        component: () => import('@/views/project-stats/index.vue'),
        meta: { title: '项目统计', icon: 'DataLine' },
      },
      {
        path: 'trends',
        name: 'Trends',
        component: () => import('@/views/dashboard/index.vue'), // 临时使用仪表盘
        meta: { title: '趋势分析', icon: 'TrendCharts' },
      },
      {
        path: 'sync',
        name: 'Sync',
        component: () => import('@/views/sync/index.vue'),
        meta: { title: '数据同步', icon: 'Refresh' },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/users.vue'),
        meta: { title: '用户管理', icon: 'Users', requiresAdmin: true },
      },
      {
        path: 'admin/projects',
        name: 'ProjectManagement',
        component: () => import('@/views/admin/projects.vue'),
        meta: { title: '项目管理', icon: 'Folder', requiresAdmin: true },
      },
      {
        path: 'admin/settings',
        name: 'SystemSettings',
        component: () => import('@/views/admin/settings.vue'),
        meta: { title: '系统设置', icon: 'Setting', requiresAdmin: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面未找到' },
  },
]

// 导出 routes 供测试使用
export { routes }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 路由守卫
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - DevMetrics` : 'DevMetrics'

  // 公开路由直接通过
  if (to.meta.public) {
    // 已登录用户访问登录页，重定向到仪表盘
    if (to.path === '/login' && authStore.isAuthenticated) {
      return '/dashboard'
    }
    return true
  }

  // 检查是否已登录
  if (!authStore.isAuthenticated) {
    return '/login'
  }

  // 获取当前用户信息（如果还没有）
  if (!authStore.user) {
    try {
      await authStore.fetchCurrentUser()
    } catch {
      return '/login'
    }
  }

  // 检查管理员权限
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return '/dashboard'
  }

  return true
})

export default router
