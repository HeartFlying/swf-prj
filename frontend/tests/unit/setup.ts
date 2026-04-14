import { vi } from 'vitest'

// Canvas mock for ECharts in jsdom environment
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  // Canvas state
  save() {}
  restore() {}

  // Transformations
  scale() {}
  rotate() {}
  translate() {}
  transform() {}
  setTransform() {}
  resetTransform() {}

  // Image drawing
  drawImage() {}

  // Compositing
  globalAlpha = 1
  globalCompositeOperation = 'source-over'

  // Colors and styles
  strokeStyle = '#000'
  fillStyle = '#000'
  createLinearGradient() {
    return { addColorStop: () => {} }
  }
  createRadialGradient() {
    return { addColorStop: () => {} }
  }
  createPattern() {
    return null
  }

  // Line styles
  lineWidth = 1
  lineCap = 'butt'
  lineJoin = 'miter'
  miterLimit = 10
  lineDashOffset = 0
  setLineDash() {}
  getLineDash() {
    return []
  }

  // Text styles
  font = '10px sans-serif'
  textAlign = 'start'
  textBaseline = 'alphabetic'
  direction = 'inherit'

  // Fill and stroke
  fill() {}
  stroke() {}
  fillRect() {}
  strokeRect() {}
  clearRect() {}

  // Paths
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  arc() {}
  arcTo() {}
  ellipse() {}
  rect() {}

  // Drawing paths
  clip() {}
  isPointInPath() {
    return false
  }
  isPointInStroke() {
    return false
  }

  // Text
  fillText() {}
  strokeText() {}
  measureText() {
    return { width: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0 }
  }

  // Pixel manipulation
  createImageData() {
    return { data: new Uint8ClampedArray(4), width: 1, height: 1 }
  }
  getImageData() {
    return { data: new Uint8ClampedArray(4), width: 1, height: 1 }
  }
  putImageData() {}

  // Shadows
  shadowColor = '#000'
  shadowBlur = 0
  shadowOffsetX = 0
  shadowOffsetY = 0

  // Filters
  filter = 'none'

  // Image smoothing
  imageSmoothingEnabled = true
  imageSmoothingQuality = 'low'
}

// Mock getContext method
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function (contextId: string) {
    if (contextId === '2d') {
      return new MockCanvasRenderingContext2D(this)
    }
    if (contextId === 'webgl' || contextId === 'experimental-webgl') {
      return null
    }
    return null
  },
  writable: true,
  configurable: true,
})

// Mock canvas dimensions
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  get: function () {
    return 300
  },
  set: function () {},
  configurable: true,
})

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  get: function () {
    return 150
  },
  set: function () {},
  configurable: true,
})

// Mock getBoundingClientRect for ECharts
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: function () {
    return {
      width: 300,
      height: 150,
      top: 0,
      left: 0,
      bottom: 150,
      right: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
  },
  writable: true,
  configurable: true,
})

// Mock clientWidth and clientHeight for ECharts
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  get: function () {
    return 300
  },
  configurable: true,
})

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  get: function () {
    return 150
  },
  configurable: true,
})

// Mock offsetWidth and offsetHeight
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  get: function () {
    return 300
  },
  configurable: true,
})

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  get: function () {
    return 150
  },
  configurable: true,
})

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as any

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
global.IntersectionObserver = MockIntersectionObserver as any

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) as unknown as number
})

global.cancelAnimationFrame = vi.fn((id: number) => {
  clearTimeout(id)
})

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock console.warn for ECharts warnings
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  // Filter out ECharts warnings about DOM dimensions
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('[ECharts]') || args[0].includes('clientWidth') || args[0].includes('clientHeight'))
  ) {
    return
  }
  originalWarn.apply(console, args)
}
