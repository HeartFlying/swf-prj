<template>
  <el-breadcrumb class="tech-breadcrumb" separator="/">
    <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index" :to="item.path">
      <span class="breadcrumb-text">{{ item.name }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(Boolean)
  const items = [{ name: '首页', path: '/dashboard' }]

  const nameMap: Record<string, string> = {
    dashboard: '仪表盘',
    'personal-stats': '个人统计',
    'project-stats': '项目统计',
    trends: '趋势分析',
    sync: '数据同步',
    admin: '系统管理',
    users: '用户管理',
    projects: '项目管理',
    settings: '系统设置',
  }

  let currentPath = ''
  paths.forEach(path => {
    currentPath += `/${path}`
    if (nameMap[path]) {
      items.push({
        name: nameMap[path],
        path: currentPath,
      })
    }
  })

  return items
})
</script>

<style scoped lang="scss">
.tech-breadcrumb {
  :deep(.el-breadcrumb__item) {
    .el-breadcrumb__inner {
      color: var(--tech-text-muted);
      font-size: 14px;
      transition: color 0.3s ease;

      &.is-link {
        &:hover {
          color: var(--tech-cyan);
        }
      }
    }

    &:last-child {
      .el-breadcrumb__inner {
        color: var(--tech-text-primary);
        font-weight: 500;
      }
    }
  }

  :deep(.el-breadcrumb__separator) {
    color: var(--tech-text-muted);
    margin: 0 8px;
  }
}
</style>
