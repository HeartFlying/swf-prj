<template>
  <div class="not-found-page" data-testid="not-found-page">
    <div class="error-container" data-testid="error-container">
      <div class="error-code" data-testid="error-code">
        <span class="digit" v-for="(digit, index) in '404'" :key="index">{{ digit }}</span>
      </div>
      <div class="error-message">页面未找到</div>
      <p class="error-description" data-testid="error-description">您访问的页面不存在或已被移除</p>
      <router-link to="/dashboard" class="back-home">
        <tech-button variant="primary" :icon="ArrowLeft">返回首页</tech-button>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from '@element-plus/icons-vue'
import TechButton from '@/components/tech/TechButton.vue'
</script>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--tech-bg-primary);

  .error-container {
    text-align: center;
    padding: 40px;

    .error-code {
      font-size: 120px;
      font-weight: 700;
      font-family: var(--tech-font-mono);
      margin-bottom: 20px;

      .digit {
        display: inline-block;
        background: linear-gradient(135deg, var(--tech-cyan), var(--tech-pink));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: glitch 2s infinite;

        &:nth-child(2) {
          animation-delay: 0.2s;
        }

        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    .error-message {
      font-size: 24px;
      font-weight: 600;
      color: var(--tech-text-primary);
      margin-bottom: 12px;
    }

    .error-description {
      font-size: 14px;
      color: var(--tech-text-muted);
      margin-bottom: 32px;
    }

    .back-home {
      text-decoration: none;
    }
  }
}

@keyframes glitch {
  0%,
  100% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
}
</style>
