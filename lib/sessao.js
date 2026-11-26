import { createHmac, timingSafeEqual } from 'node:crypto'

export const NOME_COOKIE = 'gf_sessao'
export const DURACAO_MS = 7 * 24 * 60 * 60 * 1000

const assinar = (texto, segredo) => createHmac('sha256', segredo).update(texto).digest('base64url')

/** Impressão da senha atual: muda quando a senha muda, derrubando sessões antigas. */
export function impressaoSenha(senhaHash, segredo) {
  return assinar(`senha:${senhaHash}`, segredo).slice(0, 16)
}

export function criarToken({ email, senhaHash }, segredo, agora = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ e: email, h: impressaoSenha(senhaHash, segredo), x: agora + DURACAO_MS }),
  ).toString('base64url')
  return `${payload}.${assinar(payload, segredo)}`
}

/** Devolve { email, impressao } se o token for válido e não expirado; senão null. */
export function lerToken(token, segredo, agora = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payload, assinatura] = token.split('.')
  const esperada = Buffer.from(assinar(payload, segredo))
  const recebida = Buffer.from(assinatura || '')
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null
  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof dados.x !== 'number' || dados.x < agora) return null
    return { email: dados.e, impressao: dados.h }
  } catch {
    return null
  }
}

export function cookieSessao(token, { seguro }) {
  return [
    `${NOME_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(DURACAO_MS / 1000)}`,
    seguro ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ')
}

export function cookieSaida({ seguro }) {
  return [`${NOME_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0', seguro ? 'Secure' : null]
    .filter(Boolean)
    .join('; ')
}

export function lerCookies(cabecalho = '') {
  const out = {}
  for (const parte of String(cabecalho).split(';')) {
    const i = parte.indexOf('=')
    if (i > 0) out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim())
  }
  return out
}
