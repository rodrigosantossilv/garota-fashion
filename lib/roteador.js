import { ErroHttp } from './erros.js'
import { ambienteProducao, segredoSessao } from './config.js'
import { criarArmazenamento } from './armazenamento/index.js'
import * as auth from './rotas/auth.js'
import * as p from './rotas/painel.js'

/** [método, rota, função, pública?]. Tudo que não é público exige login. */
const ROTAS = [
  ['POST', 'auth/login', auth.login, true],
  ['POST', 'auth/logout', auth.logout, true],
  ['GET', 'auth/eu', auth.eu, true],
  ['POST', 'auth/senha', auth.trocarSenha, true], // confere a sessão por conta própria
  ['GET', 'painel', p.painel],
  ['POST', 'categorias', p.criarCategoria],
  ['PUT', 'categorias', p.editarCategoria],
  ['DELETE', 'categorias', p.removerCategoria],
  ['POST', 'produtos', p.criarProduto],
  ['PUT', 'produtos', p.editarProduto],
  ['DELETE', 'produtos', p.removerProduto],
  ['PUT', 'produtos/imagem', p.imagemProduto],
  ['PATCH', 'estoque', p.ajustarEstoque],
  ['PUT', 'config', p.salvarConfig],
  ['GET', 'planilha/exportar', p.exportar],
  ['GET', 'planilha/modelo', p.modelo],
  ['POST', 'planilha/importar', p.importar],
  ['GET', 'arquivo', p.arquivo],
]

/**
 * Trata uma requisição já normalizada:
 *   { metodo, rota: 'produtos', query: {}, corpo: {}, cookies: {} }
 * Devolve { status, corpo | binario, headers, cookies }.
 * Não depende da Vercel: o mesmo código roda no servidor de desenvolvimento e nos testes.
 */
export async function tratar(req, ctxParcial = {}) {
  try {
    const rota = String(req.rota || '').replace(/^\/+|\/+$/g, '')
    const encontradas = ROTAS.filter(([, r]) => r === rota)
    if (encontradas.length === 0) throw new ErroHttp(404, 'Rota não encontrada.')
    const alvo = encontradas.find(([m]) => m === req.metodo)
    if (!alvo) throw new ErroHttp(405, 'Método não permitido.')

    // Proteção contra envio de formulário de outro site (CSRF): exige o cabeçalho do painel.
    if (req.metodo !== 'GET' && req.cabecalhoPainel !== '1') {
      throw new ErroHttp(403, 'Requisição recusada.')
    }

    const ctx = {
      arm: ctxParcial.arm || criarArmazenamento(),
      segredo: ctxParcial.segredo || segredoSessao(),
      producao: ctxParcial.producao ?? ambienteProducao(),
      env: ctxParcial.env,
    }
    const [, , fn, publica] = alvo
    const usuario = publica ? null : await auth.exigirLogin(req, ctx)
    const r = await fn({ ...req, query: req.query || {}, cookies: req.cookies || {} }, ctx, usuario)
    return { status: r.status || 200, ...r }
  } catch (e) {
    if (e instanceof ErroHttp) {
      return { status: e.status, corpo: { erro: e.message, ...e.extras } }
    }
    console.error(e)
    return { status: 500, corpo: { erro: 'Erro inesperado no servidor. Tente novamente em instantes.' } }
  }
}
