import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// 测试 Element Plus 主题配置
// 验证 SCSS 变量是否正确映射到 Element Plus 主题变量
describe('Element Plus Theme Configuration', () => {
  let elementThemeContent: string
  let variablesContent: string

  beforeAll(() => {
    const stylesDir = path.resolve(__dirname, '../../../src/styles')
    elementThemeContent = fs.readFileSync(path.join(stylesDir, 'element-plus.scss'), 'utf-8')
    variablesContent = fs.readFileSync(path.join(stylesDir, 'variables.scss'), 'utf-8')
  })

  describe('Primary Colors Mapping', () => {
    it('should map primary color to #1890ff (Ant Design primary)', () => {
      expect(elementThemeContent).toContain("'base': $ant-primary-color")
      expect(variablesContent).toContain('$ant-primary-color: #1890ff')
    })

    it('should map success color to #52c41a (Ant Design success)', () => {
      expect(elementThemeContent).toContain("'success': (")
      expect(elementThemeContent).toContain("'base': $ant-success-color")
      expect(variablesContent).toContain('$ant-success-color: #52c41a')
    })

    it('should map warning color to #faad14 (Ant Design warning)', () => {
      expect(elementThemeContent).toContain("'warning': (")
      expect(elementThemeContent).toContain("'base': $ant-warning-color")
      expect(variablesContent).toContain('$ant-warning-color: #faad14')
    })

    it('should map danger/error color to #f5222d (Ant Design error)', () => {
      expect(elementThemeContent).toContain("'danger': (")
      expect(elementThemeContent).toContain("'error': (")
      expect(elementThemeContent).toContain("'base': $ant-error-color")
      expect(variablesContent).toContain('$ant-error-color: #f5222d')
    })

    it('should map info color to neutral text color', () => {
      expect(elementThemeContent).toContain("'info': (")
      expect(elementThemeContent).toContain("'base': $ant-text-color")
    })
  })

  describe('Border Radius Mapping', () => {
    it('should map base border radius to 6px (Ant Design base)', () => {
      expect(elementThemeContent).toContain("'base': $ant-border-radius-base")
      expect(variablesContent).toContain('$ant-border-radius-base: 6px')
    })

    it('should map small border radius to 4px (Ant Design sm)', () => {
      expect(elementThemeContent).toContain("'small': $ant-border-radius-sm")
      expect(variablesContent).toContain('$ant-border-radius-sm: 4px')
    })
  })

  describe('Border Color Mapping', () => {
    it('should map default border color to #d9d9d9 (Ant Design border)', () => {
      expect(elementThemeContent).toContain("'': $ant-border-color")
      expect(variablesContent).toContain('$ant-border-color: #d9d9d9')
    })

    it('should map light border color to lighter shade', () => {
      expect(elementThemeContent).toContain("'light': #e8e8e8")
    })
  })

  describe('Fill/Background Color Mapping', () => {
    it('should map fill color to #f5f5f5 (Ant Design background)', () => {
      expect(elementThemeContent).toContain("'': $ant-background-color")
      expect(variablesContent).toContain('$ant-background-color: #f5f5f5')
    })
  })

  describe('Text Color Mapping', () => {
    it('should map primary text to #262626 (Ant Design title)', () => {
      expect(elementThemeContent).toContain("'primary': $ant-title-color")
      expect(variablesContent).toContain('$ant-title-color: #262626')
    })

    it('should map regular text to #595959 (Ant Design text)', () => {
      expect(elementThemeContent).toContain("'regular': $ant-text-color")
      expect(variablesContent).toContain('$ant-text-color: #595959')
    })
  })

  describe('Box Shadow Mapping', () => {
    it('should map default shadow to Ant Design shadow-1', () => {
      expect(elementThemeContent).toContain("'': $ant-shadow-1")
      expect(variablesContent).toContain('$ant-shadow-1: 0 2px 8px rgba(0, 0, 0, 0.15)')
    })

    it('should map dark shadow to Ant Design shadow-2', () => {
      expect(elementThemeContent).toContain("'dark': $ant-shadow-2")
      expect(variablesContent).toContain('$ant-shadow-2: 0 4px 12px rgba(0, 0, 0, 0.15)')
    })
  })

  describe('Font Size Mapping', () => {
    it('should map base font size to 14px (Ant Design body)', () => {
      expect(elementThemeContent).toContain("'base': $ant-font-size-body")
      expect(variablesContent).toContain('$ant-font-size-body: 14px')
    })

    it('should map large font size to 18px', () => {
      expect(elementThemeContent).toContain("'large': 18px")
    })

    it('should map extra-large font size to 20px (Ant Design h4)', () => {
      expect(elementThemeContent).toContain("'extra-large': $ant-font-size-h4")
      expect(variablesContent).toContain('$ant-font-size-h4: 20px')
    })
  })

  describe('Spacing Mapping', () => {
    it('should map extra-small spacing to 4px (Ant Design xs)', () => {
      expect(elementThemeContent).toContain("'extra-small': $ant-spacing-xs")
      expect(variablesContent).toContain('$ant-spacing-xs: 4px')
    })

    it('should map small spacing to 8px (Ant Design sm)', () => {
      expect(elementThemeContent).toContain("'small': $ant-spacing-sm")
      expect(variablesContent).toContain('$ant-spacing-sm: 8px')
    })

    it('should map medium spacing to 16px (Ant Design md)', () => {
      expect(elementThemeContent).toContain("'medium': $ant-spacing-md")
      expect(variablesContent).toContain('$ant-spacing-md: 16px')
    })

    it('should map large spacing to 24px (Ant Design lg)', () => {
      expect(elementThemeContent).toContain("'large': $ant-spacing-lg")
      expect(variablesContent).toContain('$ant-spacing-lg: 24px')
    })

    it('should map extra-large spacing to 32px (Ant Design xl)', () => {
      expect(elementThemeContent).toContain("'extra-large': $ant-spacing-xl")
      expect(variablesContent).toContain('$ant-spacing-xl: 32px')
    })
  })

  describe('CSS Variables Export', () => {
    it('should export --el-color-primary CSS variable', () => {
      expect(elementThemeContent).toContain('--el-color-primary: #{$ant-primary-color}')
    })

    it('should export --el-border-radius-base CSS variable', () => {
      expect(elementThemeContent).toContain('--el-border-radius-base: #{$ant-border-radius-base}')
    })

    it('should export --el-text-color-primary CSS variable', () => {
      expect(elementThemeContent).toContain('--el-text-color-primary: #{$ant-title-color}')
    })

    it('should export --el-text-color-regular CSS variable', () => {
      expect(elementThemeContent).toContain('--el-text-color-regular: #{$ant-text-color}')
    })

    it('should export --el-border-color CSS variable', () => {
      expect(elementThemeContent).toContain('--el-border-color: #{$ant-border-color}')
    })

    it('should export --el-fill-color CSS variable', () => {
      expect(elementThemeContent).toContain('--el-fill-color: #{$ant-background-color}')
    })

    it('should export --el-box-shadow CSS variable', () => {
      expect(elementThemeContent).toContain('--el-box-shadow: #{$ant-shadow-1}')
    })
  })

  describe('Component Style Overrides', () => {
    it('should override button styles', () => {
      expect(elementThemeContent).toContain('.el-button')
      expect(elementThemeContent).toContain('&--primary')
    })

    it('should override input styles', () => {
      expect(elementThemeContent).toContain('.el-input')
    })

    it('should override card styles', () => {
      expect(elementThemeContent).toContain('.el-card')
    })

    it('should override table styles', () => {
      expect(elementThemeContent).toContain('.el-table')
    })

    it('should override dialog styles', () => {
      expect(elementThemeContent).toContain('.el-dialog')
    })

    it('should override tag styles', () => {
      expect(elementThemeContent).toContain('.el-tag')
    })

    it('should override menu styles', () => {
      expect(elementThemeContent).toContain('.el-menu')
    })

    it('should override pagination styles', () => {
      expect(elementThemeContent).toContain('.el-pagination')
    })
  })

  describe('Responsive Design', () => {
    it('should have mobile responsive styles', () => {
      expect(elementThemeContent).toContain('@media (max-width: 767px)')
    })

    it('should have tablet responsive styles', () => {
      expect(elementThemeContent).toContain('@media (min-width: 768px) and (max-width: 991px)')
    })
  })
})

// 测试与 variables.scss 的一致性
describe('Theme Consistency with variables.scss', () => {
  let elementThemeContent: string
  let _variablesContent: string

  beforeAll(() => {
    const stylesDir = path.resolve(__dirname, '../../../src/styles')
    elementThemeContent = fs.readFileSync(path.join(stylesDir, 'element-plus.scss'), 'utf-8')
    _variablesContent = fs.readFileSync(path.join(stylesDir, 'variables.scss'), 'utf-8')
  })

  it('should reference all Ant Design color variables', () => {
    expect(elementThemeContent).toContain('$ant-primary-color')
    expect(elementThemeContent).toContain('$ant-success-color')
    expect(elementThemeContent).toContain('$ant-warning-color')
    expect(elementThemeContent).toContain('$ant-error-color')
  })

  it('should reference all Ant Design typography variables', () => {
    expect(elementThemeContent).toContain('$ant-font-size-body')
    expect(elementThemeContent).toContain('$ant-font-size-h4')
    expect(elementThemeContent).toContain('$ant-font-weight-regular')
    expect(elementThemeContent).toContain('$ant-font-weight-medium')
  })

  it('should reference all Ant Design spacing variables', () => {
    expect(elementThemeContent).toContain('$ant-spacing-xs')
    expect(elementThemeContent).toContain('$ant-spacing-sm')
    expect(elementThemeContent).toContain('$ant-spacing-md')
    expect(elementThemeContent).toContain('$ant-spacing-lg')
    expect(elementThemeContent).toContain('$ant-spacing-xl')
  })

  it('should reference all Ant Design border radius variables', () => {
    expect(elementThemeContent).toContain('$ant-border-radius-sm')
    expect(elementThemeContent).toContain('$ant-border-radius-base')
    expect(elementThemeContent).toContain('$ant-border-radius-lg')
  })

  it('should reference all Ant Design shadow variables', () => {
    expect(elementThemeContent).toContain('$ant-shadow-1')
    expect(elementThemeContent).toContain('$ant-shadow-2')
    expect(elementThemeContent).toContain('$ant-shadow-3')
  })
})

// 测试文件结构
describe('Theme File Structure', () => {
  it('should have element-plus.scss file', () => {
    const filePath = path.resolve(__dirname, '../../../src/styles/element-plus.scss')
    expect(fs.existsSync(filePath)).toBe(true)
  })

  it('should have variables.scss file', () => {
    const filePath = path.resolve(__dirname, '../../../src/styles/variables.scss')
    expect(fs.existsSync(filePath)).toBe(true)
  })

  it('should import variables.scss in element-plus.scss', () => {
    const stylesDir = path.resolve(__dirname, '../../../src/styles')
    const content = fs.readFileSync(path.join(stylesDir, 'element-plus.scss'), 'utf-8')
    expect(content).toContain("@use './variables.scss'")
  })
})
