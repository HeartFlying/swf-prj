# 可复用图表组件库

基于 Vue 3 + TypeScript + ECharts 的图表组件库。

## 组件列表

- `BaseChart` - 基础图表组件，封装 ECharts 通用逻辑
- `LineChart` - 折线图组件
- `BarChart` - 柱状图组件
- `PieChart` - 饼图组件
- `HeatmapChart` - 热力图组件

## 使用方法

### 基础用法

```vue
<template>
  <LineChart
    :x-axis-data="['周一', '周二', '周三', '周四', '周五']"
    :series="[{ name: '提交数', data: [120, 200, 150, 80, 70] }]"
    height="300px"
  />
</template>

<script setup lang="ts">
import { LineChart } from '@/components/charts'
</script>
```

### 折线图 (LineChart)

```vue
<LineChart
  title="提交趋势"
  :x-axis-data="dates"
  :series="[
    {
      name: '本周',
      data: [120, 200, 150, 80, 70, 110, 130],
      smooth: true,
      areaStyle: true,
    },
    {
      name: '上周',
      data: [90, 150, 120, 100, 90, 80, 100],
      smooth: true,
    },
  ]"
  show-area
  :area-opacity="0.3"
  height="320px"
/>
```

### 柱状图 (BarChart)

```vue
<BarChart
  title="代码统计"
  :x-axis-data="['项目A', '项目B', '项目C', '项目D']"
  :series="[
    { name: '新增', data: [120, 200, 150, 80] },
    { name: '删除', data: [50, 80, 60, 40] },
  ]"
  :stacked="true"
  height="300px"
/>
```

### 饼图 (PieChart)

```vue
<PieChart
  title="语言分布"
  type="donut"
  :data="[
    { name: 'TypeScript', value: 45, color: '#3178c6' },
    { name: 'Python', value: 25, color: '#3776ab' },
    { name: 'Vue', value: 15, color: '#4fc08d' },
    { name: '其他', value: 15, color: '#8b949e' },
  ]"
  height="280px"
/>
```

### 热力图 (HeatmapChart)

```vue
<HeatmapChart
  title="活跃度热力图"
  :data="heatmapData"
  :x-axis-data="['周一', '周二', '周三', '周四', '周五']"
  :y-axis-data="['上午', '下午', '晚上']"
  color-scheme="blue"
  height="300px"
/>
```

## 通用 Props

| 属性       | 类型             | 默认值  | 说明         |
| ---------- | ---------------- | ------- | ------------ |
| width      | string           | '100%'  | 图表宽度     |
| height     | string           | '300px' | 图表高度     |
| loading    | boolean          | false   | 加载状态     |
| autoResize | boolean          | true    | 自动调整大小 |
| theme      | string \| object | 'dark'  | 主题         |

## 主题支持

内置主题：

- `dark` / `tech-dark` - 科技风深色主题（默认）
- `light` / `tech-light` - 科技风浅色主题

## 事件

所有组件都支持以下事件：

- `click` - 点击事件
- `dblclick` - 双击事件
- `resize` - 大小改变事件

## 方法

通过 ref 可以调用以下方法：

```vue
<template>
  <LineChart ref="chartRef" ... />
</template>

<script setup>
const chartRef = ref()

// 调整大小
chartRef.value?.resize()

// 获取配置
const option = chartRef.value?.getOption()

// 清空图表
chartRef.value?.clear()

// 触发 action
chartRef.value?.dispatchAction({ type: 'highlight', seriesIndex: 0 })
</script>
```
