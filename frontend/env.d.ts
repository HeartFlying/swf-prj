/// <reference types="vite/client" />

import type { TransitionType, SlideDirection } from '@/components/transition/PageTransition.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题 */
    title?: string
    /** 是否公开路由（无需登录） */
    public?: boolean
    /** 是否需要管理员权限 */
    requiresAdmin?: boolean
    /** 图标名称 */
    icon?: string
    /** 页面过渡动画类型 */
    transitionType?: TransitionType
    /** 页面过渡动画时长（毫秒） */
    transitionDuration?: number
    /** 页面过渡动画方向 */
    transitionDirection?: SlideDirection
  }
}

export {}

