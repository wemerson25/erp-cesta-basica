/**
 * Lançador silencioso do ERP Cesta Básica.
 * Inicia backend e frontend em background (sem janelas), depois abre o navegador.
 */
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

const ROOT = __dirname

// Garante que Python esteja no PATH (instalações via winget/Microsoft Store)
const PYTHON_SEARCH = [
  path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python', 'Python312'),
  path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python', 'Python311'),
  path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python', 'Python310'),
  'C:\\Python312', 'C:\\Python311', 'C:\\Python310',
  'C:\\Program Files\\Python312', 'C:\\Program Files\\Python311',
]
for (const p of PYTHON_SEARCH) {
  if (fs.existsSync(path.join(p, 'python.exe'))) {
    process.env.PATH = p + ';' + process.env.PATH
    break
  }
}

function checkPort(port) {
  // Testa IPv4 e IPv6 (Vite vincula em ::1 por padrão no Windows)
  const hosts = ['127.0.0.1', '::1', 'localhost']
  return Promise.any(
    hosts.map(
      (hostname) =>
        new Promise((resolve, reject) => {
          const req = http.get(
            { hostname, port, path: '/', timeout: 1500, family: hostname === '::1' ? 6 : 4 },
            () => { req.destroy(); resolve(true) }
          )
          req.on('error', reject)
          req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
        })
    )
  ).catch(() => false)
}

function waitFor(port, maxMs = 40000) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const poll = () =>
      checkPort(port).then((up) => {
        if (up || Date.now() - t0 >= maxMs) resolve(up)
        else setTimeout(poll, 800)
      })
    poll()
  })
}

const bg = (cwd) => ({ cwd, detached: true, stdio: 'ignore', windowsHide: true })

function run(command, cwd) {
  // Usa cmd /c para garantir PATH completo e compatibilidade com .cmd no Windows
  return spawn('cmd', ['/c', command], bg(cwd))
}

async function main() {
  const [backendUp, frontendUp] = await Promise.all([checkPort(8000), checkPort(5173)])

  if (!backendUp) {
    run('python -m uvicorn main:app --port 8000', path.join(ROOT, 'backend')).unref()
  }

  if (!frontendUp) {
    run('npm run dev', path.join(ROOT, 'frontend')).unref()
  }

  if (!backendUp || !frontendUp) {
    await Promise.all([
      backendUp ? Promise.resolve() : waitFor(8000),
      frontendUp ? Promise.resolve() : waitFor(5173),
    ])
  }

  run('start http://localhost:5173', ROOT).unref()
  process.exit(0)
}

main().catch(() => {
  run('start http://localhost:5173', ROOT).unref()
  process.exit(0)
})
