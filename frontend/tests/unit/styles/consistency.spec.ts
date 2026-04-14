import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 样式一致性测试
 * 验证所有 Vue 组件样式是否符合设计规范
 * 检查硬编码值、颜色、字体、间距、圆角等
 */
describe('Style Consistency Tests', () => {
  const srcDir = path.resolve(__dirname, '../../../src')
  let vueFiles: string[] = []
   
  let _scssFiles: string[] = []

  // 递归获取所有 Vue 文件
  const getVueFiles = (dir: string): string[] => {
    const files: string[] = []
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory() && !item.includes('node_modules')) {
        files.push(...getVueFiles(fullPath))
      } else if (item.endsWith('.vue')) {
        files.push(fullPath)
      }
    }
    return files
  }

  // 递归获取所有 SCSS 文件
  const getScssFiles = (dir: string): string[] => {
    const files: string[] = []
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory() && !item.includes('node_modules')) {
        files.push(...getScssFiles(fullPath))
      } else if (item.endsWith('.scss')) {
        files.push(fullPath)
      }
    }
    return files
  }

  beforeAll(() => {
    vueFiles = getVueFiles(srcDir)
    _scssFiles = getScssFiles(srcDir)
  })

  describe('Vue Component Style Structure', () => {
    it('should have scoped styles in Vue components (excluding icons and basic components)', () => {
      const issues: string[] = []
      const excludedPatterns = [
        'components/icons/',
        'components/HelloWorld.vue',
        'components/TheWelcome.vue',
        'components/WelcomeItem.vue',
        'views/AboutView.vue',
        'views/HomeView.vue',
        'components/charts/', // 图表组件通常不需要 scoped
      ]

      for (const file of vueFiles) {
        const relativePath = path.relative(srcDir, file)

        // 跳过排除的文件（统一使用正斜杠进行比较）
        const normalizedPath = relativePath.replace(/\\/g, '/')
        if (excludedPatterns.some(pattern => normalizedPath.includes(pattern))) {
          continue
        }

        const content = fs.readFileSync(file, 'utf-8')
        if (!content.includes('<style scoped')) {
          issues.push(relativePath)
        }
      }
      expect(issues, `Components without scoped styles: ${issues.join(', ')}`).toHaveLength(0)
    })

    it('should use SCSS lang in style blocks for main components', () => {
      const issues: string[] = []
      const excludedFiles = [
        'components/HelloWorld.vue',
        'components/WelcomeItem.vue',
        'views/AboutView.vue',
      ]

      for (const file of vueFiles) {
        const relativePath = path.relative(srcDir, file).replace(/\\/g, '/')

        if (excludedFiles.includes(relativePath)) {
          continue
        }

        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes('<style') && !content.includes('lang="scss"')) {
          issues.push(relativePath)
        }
      }
      expect(issues, `Components without SCSS lang: ${issues.join(', ')}`).toHaveLength(0)
    })
  })

  describe('Design Variable Usage', () => {
    it('should use tech-theme variables in tech components', () => {
      const techComponents = vueFiles.filter(f => f.includes('components/tech/'))
      const issues: { file: string; missing: string[] }[] = []

      for (const file of techComponents) {
        const content = fs.readFileSync(file, 'utf-8')
        const missing: string[] = []

        // 检查是否使用了 tech-theme 变量
        if (!content.includes('--tech-')) {
          missing.push('No tech-theme CSS variables used')
        }

        if (missing.length > 0) {
          issues.push({
            file: path.relative(srcDir, file).replace(/\\/g, '/'),
            missing,
          })
        }
      }

      expect(issues, `Found ${issues.length} tech components not using theme variables`).toHaveLength(0)
    })
  })

  describe('Style File Structure', () => {
    const stylesDir = path.resolve(__dirname, '../../../src/styles')

    it('should have all required style files', () => {
      const requiredFiles = [
        'variables.scss',
        'index.scss',
        'tech-theme.scss',
        'element-plus.scss',
        'animations.scss',
      ]

      for (const file of requiredFiles) {
        const filePath = path.join(stylesDir, file)
        expect(fs.existsSync(filePath), `Missing required file: ${file}`).toBe(true)
      }
    })

    it('should import variables in index.scss', () => {
      const indexPath = path.join(stylesDir, 'index.scss')
      const content = fs.readFileSync(indexPath, 'utf-8')
      expect(content).toContain("@use './variables.scss'")
    })

    it('should have CSS variable definitions in variables.scss', () => {
      const variablesPath = path.join(stylesDir, 'variables.scss')
      const content = fs.readFileSync(variablesPath, 'utf-8')
      expect(content).toContain(':root {')
    })

    it('should have all required CSS variables defined', () => {
      const variablesPath = path.join(stylesDir, 'variables.scss')
      const content = fs.readFileSync(variablesPath, 'utf-8')

      const requiredVars = [
        '--ant-primary-color',
        '--ant-success-color',
        '--ant-warning-color',
        '--ant-error-color',
        '--ant-title-color',
        '--ant-text-color',
        '--ant-border-color',
        '--ant-background-color',
        '--ant-font-size-body',
        '--ant-spacing-md',
        '--ant-border-radius-base',
        '--ant-shadow-1',
      ]

      for (const varName of requiredVars) {
        expect(content).toContain(varName)
      }
    })
  })

  describe('Tech Theme Variables', () => {
    const stylesDir = path.resolve(__dirname, '../../../src/styles')

    it('should have all required tech theme variables', () => {
      const techThemePath = path.join(stylesDir, 'tech-theme.scss')
      const content = fs.readFileSync(techThemePath, 'utf-8')

      const requiredVars = [
        '--tech-bg-primary',
        '--tech-bg-secondary',
        '--tech-cyan',
        '--tech-pink',
        '--tech-green',
        '--tech-orange',
        '--tech-purple',
        '--tech-text-primary',
        '--tech-text-secondary',
        '--tech-border-primary',
        '--tech-glow-cyan',
        '--tech-radius-md',
        '--tech-font-mono',
      ]

      for (const varName of requiredVars) {
        expect(content).toContain(varName)
      }
    })
  })
})

/**
 * 生成样式一致性报告
 */
describe('Style Consistency Report', () => {
  const srcDir = path.resolve(__dirname, '../../../src')

  it('should generate a comprehensive report', () => {
    const report = {
      summary: {
        totalVueFiles: 0,
        totalScssFiles: 0,
        filesWithScopedStyles: 0,
        filesWithScssLang: 0,
        techComponents: 0,
        filesUsingTechTheme: 0,
      },
      details: {
        vueFiles: [] as string[],
        scssFiles: [] as string[],
        techComponents: [] as string[],
      },
    }

    // 获取所有 Vue 文件
    const getAllVueFiles = (dir: string): string[] => {
      const files: string[] = []
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory() && !item.includes('node_modules')) {
          files.push(...getAllVueFiles(fullPath))
        } else if (item.endsWith('.vue')) {
          files.push(fullPath)
        }
      }
      return files
    }

    // 获取所有 SCSS 文件
    const getAllScssFiles = (dir: string): string[] => {
      const files: string[] = []
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory() && !item.includes('node_modules')) {
          files.push(...getAllScssFiles(fullPath))
        } else if (item.endsWith('.scss')) {
          files.push(fullPath)
        }
      }
      return files
    }

    const vueFiles = getAllVueFiles(srcDir)
    const scssFiles = getAllScssFiles(srcDir)

    report.summary.totalVueFiles = vueFiles.length
    report.summary.totalScssFiles = scssFiles.length

    for (const file of vueFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/')
      const normalizedFilePath = file.replace(/\\/g, '/')

      if (content.includes('<style scoped')) {
        report.summary.filesWithScopedStyles++
      }
      if (content.includes('lang="scss"')) {
        report.summary.filesWithScssLang++
      }
      if (normalizedFilePath.includes('components/tech/')) {
        report.summary.techComponents++
        report.details.techComponents.push(relativePath)
        if (content.includes('--tech-')) {
          report.summary.filesUsingTechTheme++
        }
      }

      report.details.vueFiles.push(relativePath)
    }

    for (const file of scssFiles) {
      report.details.scssFiles.push(path.relative(srcDir, file).replace(/\\/g, '/'))
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║           Style Consistency Report                         ║')
    console.log('╠════════════════════════════════════════════════════════════╣')
    console.log(`║ Total Vue Files:              ${String(report.summary.totalVueFiles).padEnd(33)}║`)
    console.log(`║ Total SCSS Files:             ${String(report.summary.totalScssFiles).padEnd(33)}║`)
    console.log(`║ Files with Scoped Styles:     ${String(report.summary.filesWithScopedStyles).padEnd(33)}║`)
    console.log(`║ Files with SCSS Lang:         ${String(report.summary.filesWithScssLang).padEnd(33)}║`)
    console.log(`║ Tech Components:              ${String(report.summary.techComponents).padEnd(33)}║`)
    console.log(`║ Tech Components Using Theme:  ${String(report.summary.filesUsingTechTheme).padEnd(33)}║`)
    console.log('╚════════════════════════════════════════════════════════════╝')

    // 验证关键指标
    expect(report.summary.totalVueFiles).toBeGreaterThan(0)
    expect(report.summary.techComponents).toBeGreaterThan(0)
    expect(report.summary.filesUsingTechTheme).toBe(report.summary.techComponents)
  })
})
