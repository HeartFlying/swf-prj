// 项目阶段常量
export const PROJECT_STAGES = {
  PLANNING: 'planning',
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance',
} as const

// 项目状态常量
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const

// 项目状态类型
export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]

// 阶段标签映射
export const STAGE_LABEL_MAP: Record<string, string> = {
  [PROJECT_STAGES.PLANNING]: '规划中',
  [PROJECT_STAGES.DEVELOPMENT]: '开发中',
  [PROJECT_STAGES.TESTING]: '测试中',
  [PROJECT_STAGES.PRODUCTION]: '已上线',
  [PROJECT_STAGES.MAINTENANCE]: '维护中',
}

// 阶段类型映射（Element Plus Tag 类型）
export const STAGE_TYPE_MAP: Record<string, string> = {
  [PROJECT_STAGES.PLANNING]: 'info',
  [PROJECT_STAGES.DEVELOPMENT]: 'primary',
  [PROJECT_STAGES.TESTING]: 'warning',
  [PROJECT_STAGES.PRODUCTION]: 'success',
  [PROJECT_STAGES.MAINTENANCE]: '',
}

// 状态标签映射
export const STATUS_LABEL_MAP: Record<string, string> = {
  [PROJECT_STATUS.ACTIVE]: '活跃',
  [PROJECT_STATUS.ARCHIVED]: '归档',
  [PROJECT_STATUS.DELETED]: '已删除',
}

// 状态类型映射
export const STATUS_TYPE_MAP: Record<string, string> = {
  [PROJECT_STATUS.ACTIVE]: 'success',
  [PROJECT_STATUS.ARCHIVED]: 'info',
  [PROJECT_STATUS.DELETED]: 'danger',
}

// 表格列配置
export const TABLE_COLUMNS = [
  {
    prop: 'name',
    label: '项目名称',
    minWidth: 200,
    slot: 'column-name',
  },
  {
    prop: 'code',
    label: '代码',
    width: 120,
  },
  {
    prop: 'stage',
    label: '阶段',
    width: 100,
    slot: 'column-stage',
    filters: [
      { text: '规划中', value: PROJECT_STAGES.PLANNING },
      { text: '开发中', value: PROJECT_STAGES.DEVELOPMENT },
      { text: '测试中', value: PROJECT_STAGES.TESTING },
      { text: '已上线', value: PROJECT_STAGES.PRODUCTION },
      { text: '维护中', value: PROJECT_STAGES.MAINTENANCE },
    ],
  },
  {
    prop: 'manager',
    label: '负责人',
    width: 120,
    slot: 'column-manager',
  },
  {
    prop: 'memberCount',
    label: '成员数',
    width: 80,
    align: 'center' as const,
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    slot: 'column-status',
    filters: [
      { text: '活跃', value: PROJECT_STATUS.ACTIVE },
      { text: '归档', value: PROJECT_STATUS.ARCHIVED },
    ],
  },
  {
    prop: 'actions',
    label: '操作',
    width: 150,
    fixed: 'right' as const,
    slot: 'column-actions',
  },
]

// 分页配置
export const DEFAULT_PAGINATION = {
  currentPage: 1,
  pageSize: 10,
  total: 0,
}

// 表单验证规则
export const FORM_RULES = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  repoUrl: [{ type: 'url' as const, message: '请输入正确的URL地址', trigger: 'blur' }],
}
