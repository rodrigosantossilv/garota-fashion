import { randomBytes } from 'node:crypto'
import { ErroHttp } from './erros.js'

let segredoDev = null

export function ambienteProducao() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
}

/** Segredo que assina o cookie de sessão. Obrigatório em produção. */
export function segredoSessao() {
  const s = process.env.SESSAO_SEGREDO
  if (s && s.length >= 32) return s
  if (ambienteProducao()) {
    throw new ErroHttp(500, 'Configuração ausente: defina SESSAO_SEGREDO (mínimo de 32 caracteres) nas variáveis de ambiente.')
  }
  if (!segredoDev) {
    segredoDev = randomBytes(48).toString('base64url')
    console.warn('[aviso] SESSAO_SEGREDO não definido no .env. Usando um segredo temporário (as sessões caem ao reiniciar).')
  }
  return segredoDev
}

export function custoBcrypt() {
  const n = Number(process.env.BCRYPT_CUSTO)
  return Number.isInteger(n) && n >= 4 && n <= 15 ? n : 12
}
