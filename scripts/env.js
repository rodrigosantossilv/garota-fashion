// Carrega o arquivo .env (se existir) sem dependências extras.
import { existsSync, readFileSync } from 'node:fs'

export function carregarEnv(arquivo = '.env') {
  if (!existsSync(arquivo)) return
  for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m || process.env[m[1]] !== undefined) continue
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}
