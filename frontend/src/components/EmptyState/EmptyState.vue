<script setup lang="ts">
import { computed } from 'vue'
import { ElEmpty, ElButton, ElIcon } from 'element-plus'
import {
  DataLine,
  Search,
  DocumentDelete,
  WarningFilled,
  Refresh,
  CircleClose,
  Lock
} from '@element-plus/icons-vue'

export type EmptyStateType = 'no-data' | 'no-search' | 'no-network' | 'no-permission' | 'error'
export type EmptyStateSize = 'small' | 'default' | 'large'
export type ButtonType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
export type ButtonSize = 'large' | 'default' | 'small'

export interface EmptyStateButton {
  text: string
  type?: ButtonType
  size?: ButtonSize
  plain?: boolean
}

export interface EmptyStateProps {
  /** 空状态类型 */
  type: EmptyStateType
  /** 自定义标题 */
  title?: string
  /** 自定义描述 */
  description?: string
  /** 图标名称（Element Plus 图标） */
  icon?: string
  /** 图片地址（替代图标） */
  image?: string
  /** 是否显示操作按钮 */
  showButton?: boolean
  /** 按钮文本 */
  buttonText?: string
  /** 按钮类型 */
  buttonType?: ButtonType
  /** 按钮尺寸 */
  buttonSize?: ButtonSize
  /** 按钮是否为朴素样式 */
  buttonPlain?: boolean
  /** 多按钮配置 */
  buttons?: EmptyStateButton[]
  /** 尺寸 */
  size?: EmptyStateSize
  /** 自定义类名 */
  customClass?: string
}

const props = withDefaults(defineProps<EmptyStateProps>(), {
  type: 'no-data',
  showButton: false,
  buttonText: '刷新',
  buttonType: 'primary',
  buttonSize: 'default',
  buttonPlain: false,
  size: 'default'
})

const emit = defineEmits<{
  (e: 'button-click', index: number): void
}>()

// 图标映射表
const iconMap: Record<string, any> = {
  DataLine,
  Search,
  DocumentDelete,
  WarningFilled,
  Refresh,
  CircleClose,
  Lock
}

// 预设配置
const presetConfig: Record<EmptyStateType, { title: string; description: string; icon: string }> = {
  'no-data': {
    title: '暂无数据',
    description: '当前列表为空，请添加数据或稍后再试',
    icon: 'DataLine'
  },
  'no-search': {
    title: '无搜索结果',
    description: '请尝试更换关键词或调整筛选条件',
    icon: 'Search'
  },
  'no-network': {
    title: '网络异常',
    description: '网络连接失败，请检查网络设置后重试',
    icon: 'CircleClose'
  },
  'no-permission': {
    title: '无权限',
    description: '您没有权限访问此内容，请联系管理员',
    icon: 'Lock'
  },
  'error': {
    title: '加载失败',
    description: '数据加载失败，请稍后重试',
    icon: 'WarningFilled'
  }
}

// 获取当前配置
const currentConfig = computed(() => presetConfig[props.type])

// 计算显示标题
const displayTitle = computed(() => props.title ?? currentConfig.value.title)

// 计算显示描述
const displayDescription = computed(() => props.description ?? currentConfig.value.description)

// 计算图标组件
const iconComponent = computed(() => {
  const iconName = props.icon ?? currentConfig.value.icon
  return iconName ? iconMap[iconName] : null
})

// 计算尺寸类名
const sizeClass = computed(() => {
  if (props.size === 'default') return ''
  return `empty-state--${props.size}`
})

// 计算组件类名
const componentClasses = computed(() => [
  'empty-state',
  `empty-state--${props.type}`,
  sizeClass.value,
  props.customClass
])

// 处理按钮点击
const handleButtonClick = (index: number = 0) => {
  emit('button-click', index)
}

// 计算是否有按钮
const hasButtons = computed(() => {
  return props.showButton || (props.buttons && props.buttons.length > 0)
})

// 计算按钮列表
const buttonList = computed((): EmptyStateButton[] => {
  if (props.buttons && props.buttons.length > 0) {
    return props.buttons
  }
  if (props.showButton) {
    return [{
      text: props.buttonText,
      type: props.buttonType,
      size: props.buttonSize,
      plain: props.buttonPlain
    }]
  }
  return []
})
</script>

<template>
  <div :class="componentClasses" data-testid="empty-state">
    <el-empty>
      <!-- 自定义图片/图标 -->
      <template #image>
        <slot name="icon">
          <img
            v-if="image"
            :src="image"
            class="empty-state__image"
            alt="empty"
          />
          <div v-else-if="iconComponent" class="empty-state__custom-icon">
            <el-icon :size="size === 'small' ? 48 : size === 'large' ? 96 : 64">
              <component :is="iconComponent" />
            </el-icon>
          </div>
        </slot>
      </template>

      <!-- 描述插槽 -->
      <template #description>
        <div class="empty-state__description-wrapper">
          <slot>
            <h3 class="empty-state__title">{{ displayTitle }}</h3>
          </slot>
          <p v-if="displayDescription" class="empty-state__description">{{ displayDescription }}</p>
        </div>
      </template>

      <!-- 底部操作区 -->
      <template #default>
        <slot name="footer">
          <div v-if="hasButtons" class="empty-state__actions">
            <el-button
              v-for="(btn, index) in buttonList"
              :key="index"
              :type="btn.type"
              :size="btn.size"
              :plain="btn.plain"
              @click="handleButtonClick(index)"
            >
              {{ btn.text }}
            </el-button>
          </div>
        </slot>
      </template>
    </el-empty>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;

  &__title {
    margin: 16px 0 8px;
    font-size: 16px;
    font-weight: 500;
    color: var(--tech-text-primary) !important;
    line-height: 1.5;
  }

  &__custom-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--tech-text-muted) !important;

    .el-icon {
      color: var(--tech-text-muted) !important;
    }
  }

  &__image {
    width: 120px;
    height: 120px;
    object-fit: contain;
  }

  &__actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }

  // 尺寸变体
  &--small {
    padding: 20px 12px;

    .empty-state__title {
      font-size: 14px;
      margin: 8px 0 4px;
    }

    .empty-state__image {
      width: 80px;
      height: 80px;
    }

    :deep(.el-empty__description) {
      font-size: 12px;
    }
  }

  &--large {
    padding: 60px 40px;

    .empty-state__title {
      font-size: 20px;
      margin: 24px 0 12px;
    }

    .empty-state__image {
      width: 160px;
      height: 160px;
    }

    :deep(.el-empty__description) {
      font-size: 14px;
    }
  }

  // 类型样式
  &--error {
    .empty-state__custom-icon {
      .el-icon {
        color: var(--tech-red) !important;
      }
    }
  }

  &__description {
    margin-top: 8px;
    color: var(--tech-text-muted) !important;
    font-size: 14px;
  }

  &__description-wrapper {
    text-align: center;
  }

  // 修复 Element Plus Empty 的默认样式
  :deep(.el-empty) {
    padding: 0;
    background: transparent !important;

    .el-empty__description {
      color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
    }

    .el-empty__image {
      opacity: 0.6;
      filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.3));
    }
  }

  :deep(.el-empty__image) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  :deep(.el-empty__description) {
    margin-top: 0;
    padding: 0;
  }

  :deep(.el-empty__bottom) {
    margin-top: 16px;
  }
}
</style>
