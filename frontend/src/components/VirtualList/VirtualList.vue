<!--
  VirtualList Component
  虚拟列表组件

  @description 高性能虚拟列表组件，支持固定高度和动态高度，适用于大数据量渲染场景
  @author DevMetrics Team

  @example
  <VirtualList :data="items" :item-height="50" :buffer="5">
    <template #default="{ item, index }">
      <div>{{ item.name }}</div>
    </template>
  </VirtualList>
-->
<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * VirtualList Component Logic
 * 虚拟列表组件逻辑
 *
 * @description 实现虚拟滚动算法，只渲染可见区域的数据项，大幅提升大数据列表性能
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { ItemMeta, VirtualListProps, VirtualListEmits } from './types'

const props = withDefaults(defineProps<VirtualListProps<T>>(), {
  estimatedHeight: 50,
  buffer: 5,
  containerHeight: undefined,
  dynamic: false,
  keyField: 'id',
})

const emit = defineEmits<VirtualListEmits>()

// ========== 模板引用 ==========
/** 容器元素引用 */
const containerRef = ref<HTMLElement | null>(null)
/** 幻影元素引用（用于撑开滚动条） */
const phantomRef = ref<HTMLElement | null>(null)
/** 列表项元素引用映射 */
const itemRefs = ref<Map<number, HTMLElement>>(new Map())

// ========== 滚动状态 ==========
/** 当前滚动位置 */
const scrollTop = ref(0)
/** 容器高度 */
const containerHeight = ref(0)

// ========== 动态高度缓存 ==========
/** 列表项元数据映射（用于动态高度计算） */
const itemMetaMap = ref<Map<number, ItemMeta>>(new Map())

/**
 * 计算实际使用的每项高度
 * @returns {number} 每项高度
 */
const actualItemHeight = computed(() => {
  return props.itemHeight > 0 ? props.itemHeight : props.estimatedHeight
})

/**
 * 计算总高度
 * @returns {number} 列表总高度
 */
const totalHeight = computed(() => {
  if (props.dynamic) {
    // 动态模式下使用估算高度计算总高度
    return props.data.length * props.estimatedHeight
  }
  return props.data.length * actualItemHeight.value
})

/**
 * 计算可见起始索引
 * @returns {number} 起始索引
 */
const startIndex = computed(() => {
  if (props.dynamic) {
    return findStartIndexByOffset(scrollTop.value)
  }
  return Math.floor(scrollTop.value / actualItemHeight.value)
})

/**
 * 计算可见结束索引
 * @returns {number} 结束索引
 */
const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / actualItemHeight.value)
  return Math.min(startIndex.value + visibleCount, props.data.length - 1)
})

/**
 * 计算带缓冲的起始索引
 * @returns {number} 带缓冲的起始索引
 */
const bufferedStartIndex = computed(() => {
  return Math.max(0, startIndex.value - props.buffer)
})

/**
 * 计算带缓冲的结束索引
 * @returns {number} 带缓冲的结束索引
 */
const bufferedEndIndex = computed(() => {
  return Math.min(props.data.length - 1, endIndex.value + props.buffer)
})

/**
 * 计算可见数据
 * @returns {T[]} 可见数据数组
 */
const visibleData = computed(() => {
  return props.data.slice(bufferedStartIndex.value, bufferedEndIndex.value + 1)
})

/**
 * 计算列表偏移量
 * @returns {number} 偏移量（像素）
 */
const listOffset = computed(() => {
  if (props.dynamic) {
    return getItemOffset(bufferedStartIndex.value)
  }
  return bufferedStartIndex.value * actualItemHeight.value
})

/**
 * 计算列表样式
 * @returns {Object} 样式对象
 */
const listStyle = computed(() => ({
  transform: `translateY(${listOffset.value}px)`,
}))

/**
 * 计算幻影元素样式（用于撑开滚动条）
 * @returns {Object} 样式对象
 */
const phantomStyle = computed(() => ({
  height: `${totalHeight.value}px`,
}))

/**
 * 计算容器样式
 * @returns {Object} 样式对象
 */
const containerStyle = computed(() => {
  if (props.containerHeight) {
    return {
      height: `${props.containerHeight}px`,
      overflow: 'auto',
    }
  }
  return {}
})

/**
 * 动态高度：根据偏移量查找起始索引（二分查找）
 * @param {number} offset - 滚动偏移量
 * @returns {number} 起始索引
 */
function findStartIndexByOffset(offset: number): number {
  let low = 0
  let high = props.data.length - 1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const meta = itemMetaMap.value.get(mid)
    const itemOffset = meta ? meta.offset : mid * props.estimatedHeight
    const itemHeight = meta ? meta.height : props.estimatedHeight

    if (itemOffset <= offset && offset < itemOffset + itemHeight) {
      return mid
    } else if (offset < itemOffset) {
      high = mid - 1
    } else {
      low = mid + 1
    }
  }

  return Math.min(low, props.data.length - 1)
}

/**
 * 动态高度：获取项的偏移量
 * @param {number} index - 列表项索引
 * @returns {number} 偏移量（像素）
 */
function getItemOffset(index: number): number {
  if (index <= 0) return 0

  const meta = itemMetaMap.value.get(index)
  if (meta) return meta.offset

  // 如果没有缓存，使用估算值
  return index * props.estimatedHeight
}

/**
 * 动态高度：更新项元数据
 * @param {number} index - 列表项索引
 * @param {number} height - 列表项高度
 */
function updateItemMeta(index: number, height: number) {
  const meta = itemMetaMap.value.get(index)
  if (meta && meta.height === height) return

  // 更新当前项
  const offset = index === 0 ? 0 : getItemOffset(index)
  itemMetaMap.value.set(index, { index, height, offset })

  // 更新后续项的偏移量
  for (let i = index + 1; i < props.data.length; i++) {
    const prevMeta = itemMetaMap.value.get(i - 1)
    if (prevMeta) {
      const currentMeta = itemMetaMap.value.get(i)
      const currentHeight = currentMeta ? currentMeta.height : props.estimatedHeight
      itemMetaMap.value.set(i, {
        index: i,
        height: currentHeight,
        offset: prevMeta.offset + prevMeta.height,
      })
    }
  }
}

/**
 * 测量列表项高度
 */
function measureItems() {
  if (!props.dynamic) return

  itemRefs.value.forEach((el, index) => {
    if (el) {
      const height = el.getBoundingClientRect().height
      updateItemMeta(index, height)
    }
  })
}

/**
 * 处理滚动事件
 * @param {Event} event - 滚动事件
 */
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const newScrollTop = target.scrollTop

  scrollTop.value = newScrollTop
  emit('scroll', newScrollTop)

  // 检测滚动到顶部
  if (newScrollTop === 0) {
    emit('scroll-top')
  }

  // 检测滚动到底部
  const scrollHeight = target.scrollHeight
  const clientHeight = target.clientHeight
  if (newScrollTop + clientHeight >= scrollHeight - 1) {
    emit('scroll-bottom')
  }
}

/**
 * 处理列表项点击
 * @param {T} item - 列表项数据
 * @param {number} index - 列表项索引
 */
function handleItemClick(item: T, index: number) {
  emit('item-click', item, index)
}

/**
 * 获取列表项的唯一键
 * @param {T} item - 列表项数据
 * @param {number} index - 列表项索引
 * @returns {string | number} 唯一键值
 */
function getItemKey(item: T, index: number): string | number {
  const key = props.keyField as string
  return item[key] ?? index
}

/**
 * 滚动到指定索引
 * @param {number} index - 目标索引
 */
function scrollToIndex(index: number) {
  if (!containerRef.value) return

  let targetOffset: number
  if (props.dynamic) {
    targetOffset = getItemOffset(index)
  } else {
    targetOffset = index * actualItemHeight.value
  }

  containerRef.value.scrollTop = targetOffset
}

/**
 * 滚动到指定偏移量
 * @param {number} offset - 目标偏移量（像素）
 */
function scrollTo(offset: number) {
  if (!containerRef.value) return
  containerRef.value.scrollTop = offset
}

/**
 * 重置滚动位置到顶部
 */
function resetScroll() {
  scrollTo(0)
}

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollTo,
  resetScroll,
  containerRef,
})

// 监听数据变化，重置元数据
watch(
  () => props.data,
  () => {
    itemMetaMap.value.clear()
    itemRefs.value.clear()
    if (props.dynamic) {
      nextTick(() => {
        measureItems()
      })
    }
  },
  { deep: true }
)

// 监听可见数据变化，测量高度
watch(
  visibleData,
  () => {
    if (props.dynamic) {
      nextTick(() => {
        measureItems()
      })
    }
  },
  { flush: 'post' }
)

// 组件挂载
onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = props.containerHeight || containerRef.value.clientHeight

    if (props.dynamic) {
      measureItems()
    }
  }
})

// 组件卸载
onUnmounted(() => {
  itemMetaMap.value.clear()
  itemRefs.value.clear()
})
</script>

<template>
  <div class="virtual-list" :style="containerStyle">
    <!-- 头部插槽 -->
    <slot name="header" />

    <!-- 主容器 -->
    <div
      v-if="data.length > 0"
      ref="containerRef"
      class="virtual-list__container"
      @scroll="handleScroll"
    >
      <!-- 幻影元素，用于撑开滚动条 -->
      <div ref="phantomRef" class="virtual-list__phantom" :style="phantomStyle" />

      <!-- 实际渲染的列表 -->
      <div class="virtual-list__list" :style="listStyle">
        <div
          v-for="(item, relativeIndex) in visibleData"
          :key="getItemKey(item, bufferedStartIndex + relativeIndex)"
          ref="(el) => { if (el) itemRefs.set(bufferedStartIndex + relativeIndex, el as HTMLElement) }"
          class="virtual-list__item"
          @click="handleItemClick(item, bufferedStartIndex + relativeIndex)"
        >
          <slot :item="item" :index="bufferedStartIndex + relativeIndex" />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="virtual-list__empty">
      <slot name="empty">
        <span class="virtual-list__empty-text">暂无数据</span>
      </slot>
    </div>

    <!-- 底部插槽 -->
    <slot name="footer" />
  </div>
</template>

<style scoped lang="scss">
.virtual-list {
  position: relative;
  width: 100%;
  height: 100%;

  &__container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  &__phantom {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    pointer-events: none;
  }

  &__list {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  &__item {
    box-sizing: border-box;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 200px;
  }

  &__empty-text {
    color: var(--tech-text-muted) !important;
    font-size: 14px;
  }
}
</style>
