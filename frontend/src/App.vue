<template>
  <div id="app" class="tech-app" data-testid="app-container">
    <router-view v-slot="{ Component, route }">
      <PageTransition
        :name="(route.meta.transitionName as TransitionName) || 'fade'"
        :duration="(route.meta.transitionDuration as number) || 300"
        mode="out-in"
      >
        <component :is="Component" :key="route.path" />
      </PageTransition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import PageTransition from '@/components/transition/PageTransition.vue'
import type { TransitionName } from '@/components/transition/PageTransition.vue'

const authStore = useAuthStore()

onMounted(() => {
  // 如果本地有token，尝试获取用户信息
  if (authStore.token) {
    authStore.fetchCurrentUser()
  }
})
</script>

<style scoped lang="scss">
.tech-app {
  width: 100%;
  min-width: 100%;
  min-height: 100vh;
  background: var(--tech-bg-primary);
}
</style>
