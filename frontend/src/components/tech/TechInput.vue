<template>
  <div
    class="tech-input-wrapper"
    :class="{
      focused: isFocused,
      error: hasError,
      disabled: disabled,
      glow: glow,
    }"
  >
    <div v-if="label" class="input-label">
      <span class="label-text">{{ label }}</span>
      <span v-if="required" class="required-mark">*</span>
    </div>
    <div class="input-container">
      <span v-if="prefixIcon" class="input-prefix">
        <el-icon><component :is="prefixIcon" /></el-icon>
      </span>
      <input
        ref="inputRef"
        class="tech-input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      <span v-if="suffixIcon" class="input-suffix">
        <el-icon><component :is="suffixIcon" /></el-icon>
      </span>
      <span v-if="clearable && modelValue" class="input-clear" @click="clear">
        <el-icon><CircleClose /></el-icon>
      </span>
    </div>
    <div v-if="errorMessage" class="input-error">
      <el-icon><Warning /></el-icon>
      <span>{{ errorMessage }}</span>
    </div>
    <div v-else-if="hint" class="input-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { CircleClose, Warning } from '@element-plus/icons-vue'

interface Props {
  modelValue: string
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
  label?: string
  placeholder?: string
  hint?: string
  errorMessage?: string
  prefixIcon?: Component
  suffixIcon?: Component
  clearable?: boolean
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  glow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  clearable: false,
  disabled: false,
  readonly: false,
  required: false,
  glow: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  clear: []
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)

const hasError = computed(() => !!props.errorMessage)

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleFocus = (e: FocusEvent) => {
  isFocused.value = true
  emit('focus', e)
}

const handleBlur = (e: FocusEvent) => {
  isFocused.value = false
  emit('blur', e)
}

const handleKeydown = (e: KeyboardEvent) => {
  emit('keydown', e)
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

const focus = () => {
  inputRef.value?.focus()
}

const blur = () => {
  inputRef.value?.blur()
}

defineExpose({
  focus,
  blur,
  input: inputRef,
})
</script>

<style scoped lang="scss">
.tech-input-wrapper {
  width: 100%;

  .input-label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--tech-text-secondary);

    .required-mark {
      color: var(--tech-pink);
    }
  }

  .input-container {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--tech-bg-tertiary);
    border: 1px solid var(--tech-border-secondary);
    border-radius: var(--tech-radius-md);
    transition: all 0.3s ease;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--tech-cyan);
      transition: width 0.3s ease;
    }
  }

  .input-prefix,
  .input-suffix {
    display: flex;
    align-items: center;
    padding: 0 12px;
    color: var(--tech-text-muted);
    font-size: 16px;
  }

  .input-clear {
    display: flex;
    align-items: center;
    padding: 0 12px;
    color: var(--tech-text-muted);
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
      color: var(--tech-pink);
    }
  }

  .tech-input {
    flex: 1;
    padding: 12px 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--tech-text-primary);
    font-family: var(--tech-font-chinese);
    font-size: 14px;

    &::placeholder {
      color: var(--tech-text-muted);
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--tech-text-disabled);
    }
  }

  .input-error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 12px;
    color: var(--tech-pink);

    .el-icon {
      font-size: 14px;
    }
  }

  .input-hint {
    margin-top: 6px;
    font-size: 12px;
    color: var(--tech-text-muted);
  }

  // 聚焦状态
  &.focused .input-container {
    border-color: var(--tech-cyan);
    box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);

    &::before {
      width: 100%;
    }
  }

  // 错误状态
  &.error .input-container {
    border-color: var(--tech-pink);
    box-shadow: 0 0 15px rgba(255, 0, 110, 0.2);

    &::before {
      background: var(--tech-pink);
      width: 100%;
    }
  }

  // 禁用状态
  &.disabled .input-container {
    background: var(--tech-bg-secondary);
    cursor: not-allowed;
  }

  // 发光效果
  &.glow.focused .input-container {
    box-shadow:
      0 0 20px rgba(0, 212, 255, 0.3),
      inset 0 0 10px rgba(0, 212, 255, 0.05);
  }
}
</style>
