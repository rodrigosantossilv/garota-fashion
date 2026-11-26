import { tratar } from './roteador.js'
import { lerCookies } from './sessao.js'

const LIMITE_CORPO = 4 * 1024 * 1024

async function lerCorpo(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  const partes = []
  let total = 0
  for await (const parte of req) {
    total += parte.length
    if (total > LIMITE_CORPO) throw Object.assign(new Error('grande'), { grande: true })
    partes.push(parte)
  }
  const texto = Buffer.concat(partes).toString('utf8')
  return texto ? JSON.parse(texto) : {}
}

/** Liga uma requisição Node (Vercel ou servidor do Vite) ao roteador da API. */
export async function tratarNode(req, res, ctx) {
  const url = new URL(req.url, 'http://localhost')
  const query = Object.fromEntries(url.searchParams)
  let rota = url.pathname.replace(/^\/api\/?/, '')
  if (rota === 'roteador' || rota === '') rota = query.rota || ''
  delete query.rota

  let resposta
  try {
    const corpo = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await lerCorpo(req) : {}
    resposta = await tratar(
      {
        metodo: req.method,
        rota,
        query,
        corpo,
        cookies: lerCookies(req.headers.cookie),
        cabecalhoPainel: req.headers['x-garota-painel'],
      },
      ctx,
    )
  } catch (e) {
    resposta = e.grande
      ? { status: 413, corpo: { erro: 'O envio é grande demais (máximo de 4 MB).' } }
      : { status: 400, corpo: { erro: 'Corpo da requisição inválido.' } }
  }

  res.statusCode = resposta.status
  res.setHeader('Cache-Control', 'no-store')
  for (const [k, v] of Object.entries(resposta.headers || {})) res.setHeader(k, v)
  if (resposta.cookies?.length) res.setHeader('Set-Cookie', resposta.cookies)
  if (resposta.binario) {
    res.end(resposta.binario)
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(resposta.corpo ?? {}))
  }
}
