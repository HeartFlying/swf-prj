<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ElSelect,
  ElOption,
  ElTag,
  ElIcon,
  ElEmpty,
} from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'

// 项目类型定义
export interface IProject {
  id: number | string
  name: string
  description?: string
  icon?: string
  avatar?: string
  disabled?: boolean
}

// 组件属性
export interface ProjectSelectorProps {
  /** 项目列表 */
  projects: IProject[]
  /** 选中的项目ID（单选） */
  modelValue?: number | string
  /** 选中的项目ID列表（多选） */
  modelValueList?: (number | string)[]
  /** 是否多选 */
  multiple?: boolean
  /** 占位文本 */
  placeholder?: string
  /** 是否可清空 */
  clearable?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 尺寸 */
  size?: 'large' | 'default' | 'small'
  /** 选择器宽度 */
  width?: string | number
  /** 是否显示搜索 */
  filterable?: boolean
  /** 是否折叠标签 */
  collapseTags?: boolean
  /** 最大选择数量 */
  maxCount?: number
  /** 自定义过滤方法 */
  filterMethod?: (query: string, project: IProject) => boolean
}

const props = withDefaults(defineProps<ProjectSelectorProps>(), {
  projects: () => [],
  multiple: false,
  placeholder: '选择项目',
  clearable: true,
  disabled: false,
  size: 'default',
  width: '240px',
  filterable: true,
  collapseTags: true,
  maxCount: undefined,
})

const emit = defineEmits<{
  /** 单选值变化 */
  (e: 'update:modelValue', value: number | string | undefined): void
  /** 多选值变化 */
  (e: 'update:modelValueList', value: (number | string)[]): void
  /** 选择变化事件 */
  (e: 'change', value: number | string | (number | string)[] | undefined, project?: IProject | IProject[]): void
}>()

// 搜索关键词
const searchQuery = ref('')

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchQuery.value || !props.filterable) {
    return props.projects
  }

  const query = searchQuery.value.toLowerCase()

  return props.projects.filter((project) => {
    if (props.filterMethod) {
      return props.filterMethod(searchQuery.value, project)
    }
    // 默认过滤逻辑：匹配名称或描述
    const nameMatch = project.name.toLowerCase().includes(query)
    const descMatch = project.description?.toLowerCase().includes(query)
    return nameMatch || descMatch
  })
})

// 当前选中的项目（单选）
const selectedProject = computed(() => {
  if (props.multiple) return undefined
  return props.projects.find((p) => p.id === props.modelValue)
})

// 当前选中的项目列表（多选）
const selectedProjects = computed(() => {
  if (!props.multiple) return []
  const selectedIds = props.modelValueList || []
  return props.projects.filter((p) => selectedIds.includes(p.id))
})

// 处理单选变化
const handleSingleChange = (value: number | string) => {
  const project = props.projects.find((p) => p.id === value)
  emit('update:modelValue', value)
  emit('change', value, project)
}

// 处理多选变化
const handleMultipleChange = (values: (number | string)[]) => {
  // 检查是否超过最大选择数量
  if (props.maxCount && values.length > props.maxCount) {
    values = values.slice(0, props.maxCount)
  }

  const projects = props.projects.filter((p) => values.includes(p.id))
  emit('update:modelValueList', values)
  emit('change', values, projects)
}

// 处理清空
const handleClear = () => {
  if (props.multiple) {
    emit('update:modelValueList', [])
    emit('change', [])
  } else {
    emit('update:modelValue', undefined)
    emit('change', undefined)
  }
}

// 获取项目首字母（用于默认头像）
const getProjectInitial = (name: string): string => {
  return name.charAt(0).toUpperCase()
}

// 获取项目显示文本
const getProjectDisplay = (project: IProject): string => {
  return project.name
}

// 暴露方法
defineExpose({
  /** 获取选中的项目 */
  getSelectedProjects: () => {
    if (props.multiple) {
      return selectedProjects.value
    }
    return selectedProject.value
  },
  /** 清空选择 */
  clear: handleClear,
  /** 设置搜索关键词 */
  setSearchQuery: (query: string) => {
    searchQuery.value = query
  },
})
</script>

<template>
  <div class="project-selector">
    <ElSelect
      :model-value="multiple ? modelValueList : modelValue"
      :multiple="multiple"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      :size="size"
      :filterable="filterable"
      :collapse-tags="collapseTags"
      :collapse-tags-tooltip="true"
      :multiple-limit="maxCount"
      :style="{ width: typeof width === 'number' ? `${width}px` : width }"
      class="project-select"
      popper-class="project-selector-dropdown"
      @change="multiple ? handleMultipleChange($event as any) : handleSingleChange($event as any)"
      @clear="handleClear"
    >
      <!-- 单选时的自定义模板 -->
      <template #default v-if="!multiple && selectedProject">
        <div class="selected-project">
          <div class="project-avatar">
            <img
              v-if="selectedProject.avatar"
              :src="selectedProject.avatar"
              :alt="selectedProject.name"
              class="avatar-img"
            />
            <ElIcon v-else><FolderOpened /></ElIcon>
          </div>
          <span class="project-name">{{ selectedProject.name }}</span>
        </div>
      </template>

      <!-- 多选时的标签模板 -->
      <template #tag v-if="multiple">
        <ElTag
          v-for="project in selectedProjects.slice(0, 3)"
          :key="project.id"
          size="small"
          closable
          @close="handleMultipleChange((modelValueList || []).filter(id => id !== project.id))"
        >
          <div class="tag-content">
            <ElIcon v-if="!project.avatar" class="tag-icon"><FolderOpened /></ElIcon>
            <img v-else :src="project.avatar" class="tag-avatar" />
            <span>{{ project.name }}</span>
          </div>
        </ElTag>
        <ElTag v-if="selectedProjects.length > 3" size="small" type="info">
          +{{ selectedProjects.length - 3 }}
        </ElTag>
      </template>

      <!-- 选项列表 -->
      <ElOption
        v-for="project in filteredProjects"
        :key="project.id"
        :label="project.name"
        :value="project.id"
        :disabled="project.disabled"
        class="project-option"
      >
        <div class="project-option-content">
          <div class="project-avatar">
            <img
              v-if="project.avatar"
              :src="project.avatar"
              :alt="project.name"
              class="avatar-img"
            />
            <div v-else class="default-avatar">
              {{ getProjectInitial(project.name) }}
            </div>
          </div>
          <div class="project-info">
            <div class="project-name">{{ project.name }}</div>
            <div v-if="project.description" class="project-desc">
              {{ project.description }}
            </div>
          </div>
        </div>
      </ElOption>

      <!-- 空状态 -->
      <template #empty>
        <ElEmpty description="暂无项目" :image-size="60">
          <template #description>
            <div class="empty-content">
              <p>暂无项目</p>
              <p v-if="searchQuery" class="empty-tip">没有找到匹配 "{{ searchQuery }}" 的项目</p>
            </div>
          </template>
        </ElEmpty>
      </template>
    </ElSelect>
  </div>
</template>

<style scoped lang="scss">
.project-selector {
  display: inline-block;

  .project-select {
    :deep(.el-select__selection) {
      display: flex;
      align-items: center;
    }

    :deep(.el-select__selected-item) {
      display: flex;
      align-items: center;
    }
  }

  .selected-project {
    display: flex;
    align-items: center;
    gap: 8px;

    .project-avatar {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(34, 211, 238, 0.15) !important;
      border-radius: 4px;
      color: var(--tech-cyan) !important;
      font-size: 12px;

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
      }
    }

    .project-name {
      font-size: 14px;
      color: var(--tech-text-primary) !important;
    }
  }

  .tag-content {
    display: flex;
    align-items: center;
    gap: 4px;

    .tag-icon {
      font-size: 12px;
    }

    .tag-avatar {
      width: 14px;
      height: 14px;
      border-radius: 2px;
      object-fit: cover;
    }
  }
}

.project-option {
  padding: 8px 12px !important;

  &.is-selected {
    background-color: rgba(34, 211, 238, 0.15) !important;
  }

  .project-option-content {
    display: flex;
    align-items: center;
    gap: 12px;

    .project-avatar {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(34, 211, 238, 0.15) !important;
      border-radius: 6px;
      overflow: hidden;

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .default-avatar {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(34, 211, 238, 0.5), var(--tech-cyan)) !important;
        color: white;
        font-size: 14px;
        font-weight: 600;
      }
    }

    .project-info {
      flex: 1;
      min-width: 0;

      .project-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--tech-text-primary) !important;
        line-height: 1.4;
      }

      .project-desc {
        font-size: 12px;
        color: var(--tech-text-muted) !important;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}

.empty-content {
  text-align: center;
  padding: 8px 0;

  p {
    margin: 0;
    color: var(--tech-text-muted) !important;
    font-size: 14px;
  }

  .empty-tip {
    font-size: 12px;
    color: var(--tech-text-muted) !important;
    margin-top: 4px;
  }
}
</style>

<style lang="scss">
// 下拉菜单样式
.project-selector-dropdown {
  .el-select-dropdown__item {
    padding: 0 !important;
  }

  .el-select-dropdown__list {
    padding: 4px 0;
  }
}
</style>
