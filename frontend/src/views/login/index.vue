<!--
  Login Page Component
  登录页面组件

  @description 用户登录页面，提供账号密码登录功能，包含粒子动画背景和科技感UI设计
  @author DevMetrics Team

  @example
  <LoginPage />
-->
<template>
  <div class="login-page">
    <!-- 粒子背景 -->
    <canvas ref="particleCanvas" class="particle-canvas" data-testid="particle-canvas"></canvas>

    <!-- 扫描线 -->
    <scan-line :speed="5" :opacity="0.4"></scan-line>

    <!-- 登录卡片 -->
    <div class="login-container">
      <div class="login-card" data-testid="login-card">
        <!-- 霓虹边框效果 -->
        <div class="neon-border-top" data-testid="neon-border-top"></div>
        <div class="neon-border-right" data-testid="neon-border-right"></div>
        <div class="neon-border-bottom" data-testid="neon-border-bottom"></div>
        <div class="neon-border-left" data-testid="neon-border-left"></div>

        <!-- Logo -->
        <div class="login-logo" data-testid="login-logo">
          <div class="logo-icon animate-pulse" data-testid="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <h1 class="logo-title" data-testid="logo-title">DevMetrics</h1>
          <p class="logo-subtitle" data-testid="logo-subtitle">开发者绩效统计平台</p>
        </div>

        <!-- 登录表单 -->
        <form class="login-form" data-testid="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <div class="input-wrapper" :class="{ focused: focusedField === 'username' }">
              <span class="input-icon" data-testid="input-icon">
                <el-icon><User /></el-icon>
              </span>
              <input
                v-model="form.username"
                type="text"
                placeholder="用户名"
                @focus="focusedField = 'username'"
                @blur="focusedField = null"
                @keyup.enter="handleLogin"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="input-wrapper" :class="{ focused: focusedField === 'password' }">
              <span class="input-icon" data-testid="input-icon">
                <el-icon><Lock /></el-icon>
              </span>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="密码"
                @focus="focusedField = 'password'"
                @blur="focusedField = null"
                @keyup.enter="handleLogin"
              />
              <button type="button" class="toggle-password" aria-label="切换密码可见性" @click="showPassword = !showPassword">
                <el-icon>
                  <component :is="showPassword ? Hide : View" />
                </el-icon>
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="remember-me">
              <input v-model="form.remember" type="checkbox" />
              <span>记住我</span>
            </label>
            <a href="#" class="forgot-password">忘记密码？</a>
          </div>

          <button
            type="submit"
            class="login-btn"
            :class="{ loading: authStore.loading }"
            :disabled="authStore.loading || !isFormValid"
          >
            <span v-if="authStore.loading" class="btn-loader" data-testid="btn-loader" />
            <span v-else>登 录</span>
          </button>
        </form>

        <!-- 装饰元素 -->
        <div class="decoration-corners">
          <span class="corner top-left" data-testid="corner-top-left" />
          <span class="corner top-right" data-testid="corner-top-right" />
          <span class="corner bottom-left" data-testid="corner-bottom-left" />
          <span class="corner bottom-right" data-testid="corner-bottom-right" />
        </div>
      </div>

      <!-- 版本信息 -->
      <div class="version-info" data-testid="version-info">
        <span>DevMetrics v1.0.0</span>
        <span class="divider" />
        <span>系统状态: <span class="status online" data-testid="status-online">在线</span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Login Page Logic
 * 登录页面逻辑
 *
 * @description 处理用户登录逻辑、表单验证和粒子动画效果
 */
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, View, Hide } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import ScanLine from '@/components/tech/ScanLine.vue'

const router = useRouter()
const authStore = useAuthStore()

/** 登录表单数据 */
const form = reactive({
  username: '',
  password: '',
  remember: false,
})

/** 当前聚焦的字段 */
const focusedField = ref<string | null>(null)
/** 是否显示密码 */
const showPassword = ref(false)
/** 粒子画布引用 */
const particleCanvas = ref<HTMLCanvasElement>()

/**
 * 表单验证状态
 * @returns {boolean} 表单是否有效
 */
const isFormValid = computed(() => {
  return form.username.trim().length >= 3 && form.password.length >= 6
})

/**
 * 处理登录提交
 * @async
 * @returns {Promise<void>}
 */
const handleLogin = async () => {
  if (!isFormValid.value) {
    ElMessage.warning('请输入有效的用户名和密码')
    return
  }

  try {
    await authStore.login({
      username: form.username,
      password: form.password,
    })
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (_error) {
    ElMessage.error('登录失败，请检查用户名和密码')
  }
}

// ========== 粒子动画 ==========
/** 动画帧ID */
let animationId: number
/** 粒子数组 */
let particles: Array<{
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}> = []

/**
 * 初始化粒子动画
 * @returns {Function | undefined} 清理函数
 */
const initParticles = () => {
  const canvas = particleCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  /**
   * 调整画布大小
   */
  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  // 创建粒子
  const particleCount = 50
  particles = []
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    })
  }

  /**
   * 动画循环
   */
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 更新和绘制粒子
    particles.forEach((p, i) => {
      p.x += p.vx
      p.y += p.vy

      // 边界检测
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1

      // 绘制粒子
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 150, 200, ${p.opacity * 0.6})`
      ctx.fill()

      // 绘制连线
      particles.slice(i + 1).forEach(p2 => {
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 150) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(0, 150, 200, ${0.06 * (1 - dist / 150)})`
          ctx.stroke()
        }
      })
    })

    animationId = requestAnimationFrame(animate)
  }

  animate()

  return () => {
    window.removeEventListener('resize', resize)
    cancelAnimationFrame(animationId)
  }
}

onMounted(() => {
  const cleanup = initParticles()
  onUnmounted(() => {
    cleanup?.()
  })
})
</script>

<style scoped lang="scss">
.login-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tech-bg-primary);
  overflow: hidden;

  .particle-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .login-container {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .login-card {
    position: relative;
    width: 420px;
    padding: 48px 40px;
    background: rgba(10, 25, 41, 0.95);
    backdrop-filter: blur(20px);
    border-radius: var(--tech-radius-xl);
    border: 1px solid var(--tech-border-secondary);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.1);
    overflow: hidden;

    // 霓虹边框动画
    .neon-border-top,
    .neon-border-right,
    .neon-border-bottom,
    .neon-border-left {
      position: absolute;
      background: linear-gradient(90deg, transparent, var(--tech-cyan), transparent);
      opacity: 0.5;
    }

    .neon-border-top {
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      animation: neon-flow-horizontal 3s linear infinite;
    }

    .neon-border-bottom {
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      animation: neon-flow-horizontal 3s linear infinite reverse;
    }

    .neon-border-left {
      top: 0;
      bottom: 0;
      left: 0;
      width: 2px;
      background: linear-gradient(180deg, transparent, var(--tech-cyan), transparent);
      animation: neon-flow-vertical 3s linear infinite;
    }

    .neon-border-right {
      top: 0;
      bottom: 0;
      right: 0;
      width: 2px;
      background: linear-gradient(180deg, transparent, var(--tech-cyan), transparent);
      animation: neon-flow-vertical 3s linear infinite reverse;
    }
  }

  .login-logo {
    text-align: center;
    margin-bottom: 40px;

    .logo-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--tech-cyan);
      background: rgba(0, 212, 255, 0.1);
      border-radius: var(--tech-radius-lg);
      border: 2px solid var(--tech-border-primary);
      box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);

      svg {
        width: 48px;
        height: 48px;
      }
    }

    .logo-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      font-family: var(--tech-font-mono);
      background: linear-gradient(135deg, var(--tech-cyan), var(--tech-green));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo-subtitle {
      font-size: 14px;
      color: var(--tech-text-secondary);
      margin: 0;
    }
  }

  .login-form {
    .form-group {
      margin-bottom: 20px;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      background: var(--tech-bg-tertiary);
      border: 1px solid var(--tech-border-secondary);
      border-radius: var(--tech-radius-md);
      transition: all 0.3s ease;

      &.focused {
        border-color: var(--tech-cyan);
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);
      }

      .input-icon {
        display: flex;
        align-items: center;
        padding: 0 14px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 18px;
      }

      input {
        flex: 1;
        padding: 14px 0;
        background: transparent;
        border: none;
        outline: none;
        color: var(--tech-text-primary);
        font-size: 14px;
        font-family: var(--tech-font-chinese);

        &::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
      }

      .toggle-password {
        padding: 0 14px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: color 0.3s ease;

        &:hover {
          color: var(--tech-cyan);
        }
      }
    }

    .form-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;

      .remember-me {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);

        input[type='checkbox'] {
          width: 16px;
          height: 16px;
          accent-color: var(--tech-cyan);
        }
      }

      .forgot-password {
        font-size: 13px;
        color: var(--tech-cyan);
        text-decoration: none;
        transition: opacity 0.3s ease;

        &:hover {
          opacity: 0.8;
        }
      }
    }

    .login-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, var(--tech-cyan) 0%, var(--tech-cyan-dark) 100%);
      border: none;
      border-radius: var(--tech-radius-md);
      color: var(--tech-bg-primary);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &:not(:disabled):hover {
        box-shadow: 0 0 25px rgba(0, 212, 255, 0.5);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.loading {
        color: transparent;
      }

      .btn-loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        border: 2px solid var(--tech-bg-primary);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }
  }

  .decoration-corners {
    position: absolute;
    inset: 0;
    pointer-events: none;

    .corner {
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid var(--tech-cyan);
      opacity: 0.5;

      &.top-left {
        top: 12px;
        left: 12px;
        border-right: none;
        border-bottom: none;
      }

      &.top-right {
        top: 12px;
        right: 12px;
        border-left: none;
        border-bottom: none;
      }

      &.bottom-left {
        bottom: 12px;
        left: 12px;
        border-right: none;
        border-top: none;
      }

      &.bottom-right {
        bottom: 12px;
        right: 12px;
        border-left: none;
        border-top: none;
      }
    }
  }

  .version-info {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--tech-font-mono);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

    .divider {
      width: 4px;
      height: 4px;
      background: var(--tech-border-primary);
      border-radius: 50%;
    }

    .status {
      &.online {
        color: var(--tech-green);
      }
    }
  }
}

@keyframes neon-flow-horizontal {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes neon-flow-vertical {
  0% {
    background-position: 0 -200%;
  }
  100% {
    background-position: 0 200%;
  }
}

@keyframes spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.animate-pulse {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 50px rgba(0, 212, 255, 0.6);
  }
}
</style>
