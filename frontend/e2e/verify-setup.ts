import { execSync } from 'child_process'
import * as https from 'https'
import * as http from 'http'
import { fileURLToPath } from 'url'

/**
 * 验证 E2E 测试环境是否就绪
 * 在运行测试前检查所有依赖服务
 */

const SERVICES = [
  {
    name: '后端服务',
    url: 'http://localhost:8000/health',
    required: true,
    hint: '请运行: cd backend && uvicorn app.main:app --reload',
  },
  {
    name: '前端服务',
    url: 'http://localhost:5173',
    required: true,
    hint: '请运行: cd frontend && npm run dev',
  },
  {
    name: 'PostgreSQL',
    url: null, // 通过 docker 检查
    check: () => {
      try {
        execSync('docker ps | grep postgres', { stdio: 'ignore' })
        return true
      } catch {
        return false
      }
    },
    required: false,
    hint: '请运行: docker-compose up -d',
  },
]

async function checkHttpService(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http
    const req = client.get(url, { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

export async function verifySetup(): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = []

  console.log('\n🔍 检查 E2E 测试环境...\n')

  for (const service of SERVICES) {
    process.stdout.write(`  检查 ${service.name}... `)

    let isReady = false

    if (service.check) {
      isReady = service.check()
    } else if (service.url) {
      isReady = await checkHttpService(service.url)
    }

    if (isReady) {
      console.log('✅')
    } else {
      console.log('❌')
      const message = `    ${service.name} 未就绪${service.required ? '（必需）' : '（可选）'}\n    ${service.hint}`
      console.log(message)

      if (service.required) {
        errors.push(message)
      }
    }
  }

  console.log('')

  if (errors.length > 0) {
    console.error('❌ 环境检查失败，请先启动上述服务\n')
    return { ok: false, errors }
  }

  console.log('✅ 所有必需服务已就绪\n')
  return { ok: true, errors: [] }
}

// 如果直接运行此脚本
const isMainModule = import.meta.url === `file://${fileURLToPath(import.meta.url)}`
if (isMainModule) {
  verifySetup().then((result) => {
    process.exit(result.ok ? 0 : 1)
  })
}
