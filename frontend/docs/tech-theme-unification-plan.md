# 前端科技风样式统一修订计划

## 项目概述

将前端所有页面和组件统一为科技风主题样式，消除 Element Plus 默认白色背景造成的视觉不一致问题。

## 现状分析

### 问题根源
- Element Plus 组件默认使用白色背景（`--el-bg-color: #fff`）
- 部分页面/组件仍使用 `--el-*` 变量而非科技风变量
- 样式加载顺序导致白色闪烁问题

### 评审结果
共发现 **21 个文件** 需要修复，分为：
- 高优先级：4 个（主页面）
- 中优先级：4 个（通用组件）
- 低优先级：13 个（其他组件）

## 修订策略

### 变量映射规范

| Element Plus 变量 | 科技风变量 | 用途 |
|------------------|-----------|------|
| `--el-bg-color` | `--tech-bg-card` | 卡片背景（半透明深蓝） |
| `--el-bg-color-overlay` | `--tech-bg-overlay` | 遮罩层背景 |
| `--el-fill-color-light` | `--tech-bg-secondary` | 次要背景 |
| `--el-fill-color` | `--tech-bg-tertiary` | 第三层背景 |
| `--el-text-color-primary` | `--tech-text-primary` | 主文字色（白色） |
| `--el-text-color-regular` | `--tech-text-secondary` | 次要文字色（70%白） |
| `--el-text-color-secondary` | `--tech-text-muted` | 弱化文字色（50%白） |
| `--el-border-color-light` | `--tech-border-primary` | 主边框色（青色20%） |
| `--el-border-color-lighter` | `--tech-border-secondary` | 次边框色（青色10%） |
| `--el-color-primary` | `--tech-cyan` | 主色调（青色 #00d4ff） |
| `--el-color-success` | `--tech-green` | 成功色（绿色 #00ff88） |
| `--el-color-warning` | `--tech-orange` | 警告色（橙色 #ff9500） |
| `--el-color-danger` | `--tech-red` | 危险色（红色 #ff006e） |
| `--el-color-primary-light-9` | `rgba(0, 212, 255, 0.1)` | 主色浅色背景 |
| `--el-color-primary-light-5` | `rgba(0, 212, 255, 0.3)` | 主色中色背景 |

### 组件覆盖规范

#### ElSkeleton 覆盖
```scss
:deep(.el-skeleton) {
  background: transparent !important;
  
  .el-skeleton__item {
    background: linear-gradient(
      90deg,
      rgba(0, 212, 255, 0.1) 25%,
      rgba(0, 212, 255, 0.2) 37%,
      rgba(0, 212, 255, 0.1) 63%
    ) !important;
  }
}
```

#### ElEmpty 覆盖
```scss
:deep(.el-empty) {
  background: transparent !important;
  
  .el-empty__description {
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.7)) !important;
  }
  
  .el-empty__image {
    opacity: 0.6;
    filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.3));
  }
}
```

#### ElTable 覆盖
```scss
:deep(.el-table) {
  --el-table-header-bg-color: var(--tech-bg-tertiary, #132f4c);
  --el-table-header-text-color: var(--tech-cyan, #00d4ff);
  
  .el-table__header th {
    font-weight: 600;
    color: var(--tech-cyan, #00d4ff);
    background-color: var(--tech-bg-tertiary, #132f4c);
  }
  
  .el-table__row:hover {
    background-color: rgba(0, 212, 255, 0.05);
  }
  
  td {
    color: var(--tech-text-secondary, rgba(255, 255, 255, 0.85));
  }
}
```

## 执行计划

### 阶段一：高优先级页面（已完成 ✓）

| 文件 | 状态 | 备注 |
|------|------|------|
| `views/project/ProjectList.vue` | ✅ 已完成 | 页面标题、表格区域、项目单元格 |
| `views/project/ProjectStats.vue` | ✅ 已完成 | 页面标题、统计卡片、图表占位 |
| `views/user/UserList.vue` | ✅ 已完成 | 页面标题、表格区域、用户单元格 |

### 阶段二：通用组件（已完成 ✓）

| 文件 | 状态 | 备注 |
|------|------|------|
| `components/DataCard/DataCard.vue` | ✅ 已完成 | 15 处变量替换，Skeleton 样式覆盖 |
| `components/DataFilter/DataFilter.vue` | ✅ 已完成 | 4 处变量替换 |
| `components/EmptyState/EmptyState.vue` | ✅ 已完成 | 4 处变量替换，ElEmpty 样式覆盖 |
| `components/FilterBar/FilterBar.vue` | ✅ 已完成 | 5 处变量替换 |
| `components/DateRangePicker/DateRangePicker.vue` | ✅ 已完成 | 1 处变量替换 |
| `components/ErrorBoundary/ErrorBoundary.vue` | ✅ 已完成 | 9 处变量替换 |
| `components/FormDialog/FormDialog.vue` | ✅ 已完成 | 1 处变量替换 |
| `components/ProjectSelector/ProjectSelector.vue` | ✅ 已完成 | 11 处变量替换 |

### 阶段三：统计相关组件（已完成 ✓）

| 文件 | 状态 | 备注 |
|------|------|------|
| `components/stats/RankingList.vue` | ✅ 已完成 | 17 处变量替换 |
| `components/stats/TokenUsageChart.vue` | ✅ 已完成 | 3 处变量替换 |

### 阶段四：个人中心组件（已完成 ✓）

| 文件 | 状态 | 备注 |
|------|------|------|
| `views/personal/components/ActivityHeatmap.vue` | ✅ 已完成 | 22 处变量替换 |
| `views/personal/components/RankingDisplay.vue` | ✅ 已完成 | 35 处变量替换 |
| `views/personal/components/TokenUsageChart.vue` | ✅ 已完成 | 3 处变量替换 |

### 阶段五：其他组件（已完成 ✓）

| 文件 | 状态 | 备注 |
|------|------|------|
| `components/VirtualList/VirtualList.vue` | ✅ 已完成 | 1 处变量替换 |
| `components/SyncLogViewer/SyncLogViewer.vue` | ✅ 已完成 | 11 处变量替换 |
| `views/admin/components/ProjectMemberManage.vue` | ✅ 已完成 | 6 处变量替换 |
| `views/user/components/PermissionManager.vue` | ✅ 已完成 | 5 处变量替换 |

## 质量检查清单

每个文件修复后需检查：

- [ ] 所有 `--el-bg-color*` 已替换为 `--tech-bg-*`
- [ ] 所有 `--el-text-color*` 已替换为 `--tech-text-*`
- [ ] 所有 `--el-border-color*` 已替换为 `--tech-border-*`
- [ ] 所有 `--el-fill-color*` 已替换为 `--tech-bg-*`
- [ ] 所有 `--el-color-primary` 已替换为 `--tech-cyan`
- [ ] ElSkeleton 样式已覆盖（如使用）
- [ ] ElEmpty 样式已覆盖（如使用）
- [ ] ElTable 样式已覆盖（如使用）
- [ ] 添加 `backdrop-filter: blur(10px)` 增强科技风效果
- [ ] 运行 `npm run type-check` 无错误

## 风险与注意事项

1. **theme-light 区块**：`ActivityHeatmap.vue` 中的亮色主题是故意设计，需确认是否保留
2. **第三方组件**：部分第三方组件可能无法完全覆盖样式，需评估替代方案
3. **浏览器兼容性**：`backdrop-filter` 在旧版浏览器中不支持，已添加回退值
4. **性能影响**：半透明背景和模糊效果可能增加 GPU 负担，需监控性能

## 参考文件

以下文件已正确实现科技风样式，可作为参考：

- `views/sync/index.vue` - 数据同步页面
- `views/personal-stats/index.vue` - 个人统计页面
- `views/project-stats/index.vue` - 项目统计页面
- `components/stats/StatsLayout.vue` - 统计布局组件
- `components/MemberContribution/MemberContribution.vue` - 成员贡献组件
- `layouts/TechLayout.vue` - 科技风布局

## 执行记录

| 日期 | 执行内容 | 执行人 |
|------|----------|--------|
| 2026-04-08 | 完成高优先级页面修复 | Claude |
| 2026-04-08 | 创建修订计划文档 | Claude |
| 2026-04-09 | 完成阶段二至五所有组件修复 | Claude |
| 2026-04-09 | 代码审查并修复 EmptyState、DataCard 样式问题 | Claude |

---

*计划创建时间：2026-04-08*
*计划版本：v1.0*
