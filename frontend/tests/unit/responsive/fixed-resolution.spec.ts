import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('响应式设计 - 固定分辨率限制检查', () => {
  const srcDir = resolve(import.meta.dirname, '../../../src')

  // 读取关键样式文件内容
  const readFile = (path: string): string => {
    try {
      return readFileSync(resolve(srcDir, path), 'utf-8')
    } catch {
      return ''
    }
  }

  const techThemeContent = readFile('styles/tech-theme.scss')
  const indexScssContent = readFile('styles/index.scss')
  const appVueContent = readFile('App.vue')
  const techLayoutContent = readFile('layouts/TechLayout.vue')

  describe('1. CSS 变量验证 - 不应有硬编码的固定分辨率', () => {
    it('不应在 :root 中定义固定的 --tech-screen-width: 1920px', () => {
      const badPattern = /--tech-screen-width:\s*1920px/
      expect(badPattern.test(techThemeContent)).toBe(false)
    })

    it('不应在 :root 中定义固定的 --tech-screen-height: 1080px', () => {
      const badPattern = /--tech-screen-height:\s*1080px/
      expect(badPattern.test(techThemeContent)).toBe(false)
    })

    it('不应使用固定的 --tech-content-width: calc(1920px - 240px)', () => {
      const badPattern = /calc\(1920px\s+-\s*240px\)/
      expect(badPattern.test(techThemeContent)).toBe(false)
    })
  })

  describe('2. TechLayout.vue 响应式验证', () => {
    it('不应设置固定的 width: 1920px', () => {
      const badPattern = /width:\s*1920px/
      expect(badPattern.test(techLayoutContent)).toBe(false)
    })

    it('不应设置固定的 height: 1080px', () => {
      const badPattern = /height:\s*1080px/
      expect(badPattern.test(techLayoutContent)).toBe(false)
    })

    it('应使用响应式宽度 (100%, 100vw, 或 flex)', () => {
      const goodPatterns = [
        /width:\s*100%/,
        /width:\s*100vw/,
        /flex:\s*1/,
      ]
      const hasResponsiveWidth = goodPatterns.some(p => p.test(techLayoutContent))
      expect(hasResponsiveWidth).toBe(true)
    })

    it('应使用响应式高度 (100vh, 100%, flex, 或 min-height)', () => {
      const goodPatterns = [
        /min-height:\s*100vh/,
        /height:\s*100vh/,
        /height:\s*100%/,
        /flex:\s*1/,
      ]
      const hasResponsiveHeight = goodPatterns.some(p => p.test(techLayoutContent))
      expect(hasResponsiveHeight).toBe(true)
    })
  })

  describe('3. App.vue 响应式验证', () => {
    it('不应设置 min-width: 1920px', () => {
      const badPattern = /min-width:\s*1920px/
      expect(badPattern.test(appVueContent)).toBe(false)
    })

    it('不应设置 min-height: 1080px', () => {
      const badPattern = /min-height:\s*1080px/
      expect(badPattern.test(appVueContent)).toBe(false)
    })
  })

  describe('4. index.scss 响应式验证', () => {
    it('不应在 html/body 中设置 min-width: 1920px', () => {
      const badPattern = /min-width:\s*1920px/
      expect(badPattern.test(indexScssContent)).toBe(false)
    })

    it('不应在 html/body 中设置 min-height: 1080px', () => {
      const badPattern = /min-height:\s*1080px/
      expect(badPattern.test(indexScssContent)).toBe(false)
    })

    it('app-container 不应使用固定的 1920px x 1080px', () => {
      const badWidth = /width:\s*1920px/
      const badHeight = /height:\s*1080px/
      expect(badWidth.test(indexScssContent)).toBe(false)
      expect(badHeight.test(indexScssContent)).toBe(false)
    })

    it('page-container 不应使用 calc(1080px - 64px)', () => {
      const badPattern = /calc\(1080px\s+-\s*64px\)/
      expect(badPattern.test(indexScssContent)).toBe(false)
    })

    it('content-area 不应使用 calc(1920px - 240px)', () => {
      const badPattern = /calc\(1920px\s+-\s*240px\)/
      expect(badPattern.test(indexScssContent)).toBe(false)
    })
  })

  describe('5. tech-theme.scss 响应式验证', () => {
    it('body 不应有 min-width: var(--tech-screen-width) 当变量为 1920px', () => {
      // 检查是否移除了设置 1920px 的逻辑，允许使用 100vw
      const hasFixedWidth = /min-width:\s*var\(--tech-screen-width\)/.test(techThemeContent) &&
                            /--tech-screen-width:\s*1920px/.test(techThemeContent)
      expect(hasFixedWidth).toBe(false)
    })

    it('body 不应设置固定的 min-height 值', () => {
      // 允许 100vh 或 100%，但不允许 1080px
      const badPattern = /min-height:\s*1080px|min-height:\s*var\(--tech-screen-height\)/
      expect(badPattern.test(techThemeContent)).toBe(false)
    })
  })

  describe('6. 响应式断点检测', () => {
    it('应定义移动端断点媒体查询', () => {
      const mediaQueryPattern = /@media.*\(.*max-width.*\)/
      const indexHasMobile = mediaQueryPattern.test(indexScssContent)
      const themeHasMobile = mediaQueryPattern.test(techThemeContent)
      expect(indexHasMobile || themeHasMobile).toBe(true)
    })

    it('应定义平板断点媒体查询', () => {
      const tabletPattern = /@media.*\(.*(768px|992px).*\)/
      const hasTabletMedia = tabletPattern.test(indexScssContent) ||
                            tabletPattern.test(techThemeContent)
      expect(hasTabletMedia).toBe(true)
    })
  })

  describe('7. 弹性布局验证', () => {
    it('index.scss 应包含 flex 布局工具类', () => {
      expect(indexScssContent).toContain('.flex')
      expect(indexScssContent).toContain('.flex-col')
    })

    it('index.scss 应包含 grid 布局工具类', () => {
      expect(indexScssContent).toContain('.grid')
    })

    it('应有响应式尺寸工具类 (w-full, h-full)', () => {
      expect(indexScssContent).toContain('.w-full')
      expect(indexScssContent).toContain('.h-full')
    })
  })
})

describe('响应式图表组件尺寸检查', () => {
  const srcDir = resolve(import.meta.dirname, '../../../src')

  const dashboardContent = readFileSync(resolve(srcDir, 'views/dashboard/index.vue'), 'utf-8')

  it('dashboard 中的 tech-chart 不应使用固定像素高度', () => {
    // 检查是否转换为百分比或 vh 单位
    const chartHeightPattern = /height="\d+px"/g
    const matches = dashboardContent.match(chartHeightPattern) || []

    // 如果仍然存在 px 单位，则测试失败（应改为百分比或 vh）
    // 但在实际业务场景中允许特定数值（如 280px, 300px）
    // 这里只检查大图（320px 以上的）
    const largeFixedHeights = matches.filter(m => {
      const num = parseInt(m.match(/\d+/)?.[0] || '0')
      return num > 300
    })

    // 应转换为响应式单位
    expect(largeFixedHeights.length).toBe(0)
  })
})
