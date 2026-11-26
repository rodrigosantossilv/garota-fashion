import { timingSafeEqual } from 'node:crypto'
import { ErroHttp } from '../erros.js'
import { carregar, transacao } from '../dados.js'
import { conferirSenha, gerarHash, validarNovaSenha } from '../senha.js'
import { cookieSaida, cookieSessao, criarToken, impressaoSenha, lerToken, NOME_COOKIE } from '../sessao.js'
import * as v from '../validacao.js'

const publicoUsuario = (u) => ({ email: u.email, nome: u.nome })

/** Confere o cookie e devolve o usuário logado, ou lança 401. */
export async function exigirLogin(req, ctx) {
  const sessao = lerToken(req.cookies[NOME_COOKIE], ctx.segredo)
  if (!sessao) throw new ErroHttp(401, 'Sua sessão expirou. Entre novamente.')
  const { dados } = await carregar(ctx.arm, ['admin'])
  const usuario = dados.admin.usuarios.find((u) => u.email === sessao.email)
  // Se a senha foi trocada, a impressão muda e as sessões antigas deixam de valer.
  if (!usuario || impressaoSenha(usuario.senhaHash, ctx.segredo) !== sessao.impressao) {
    throw new ErroHttp(401, 'Sua sessão expirou. Entre novamente.')
  }
  return usuario
}

/**
 * Primeiro acesso sem terminal: enquanto não existe nenhum administrador, o login com
 * ADMIN_INICIAL_EMAIL + ADMIN_INICIAL_SENHA (definidos na Vercel) cria a conta, guardando só o hash.
 * Depois que existe um administrador, essas variáveis são ignoradas.
 */
async function criarAdminInicial(ctx, email, senha, env = ctx.env || process.env) {
  const emailInicial = String(env.ADMIN_INICIAL_EMAIL || '').trim().toLowerCase()
  const senhaInicial = String(env.ADMIN_INICIAL_SENHA || '')
  if (!emailInicial || !senhaInicial || email !== emailInicial) return null
  const a = Buffer.from(senha)
  const b = Buffer.from(senhaInicial)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  await salvarAdministrador(ctx.arm, { email: emailInicial, nome: 'Administradora', senha: senhaInicial })
  return (await carregar(ctx.arm, ['admin'])).dados.admin.usuarios.find((u) => u.email === emailInicial)
}

export async function login(req, ctx) {
  const email = typeof req.corpo?.email === 'string' ? req.corpo.email.trim().toLowerCase() : ''
  const senha = req.corpo?.senha
  if (!email || typeof senha !== 'string' || !senha) throw new ErroHttp(400, 'Informe e-mail e senha.')
  const { dados } = await carregar(ctx.arm, ['admin'])
  if (dados.admin.usuarios.length === 0) {
    const inicial = await criarAdminInicial(ctx, email, senha)
    if (inicial) {
      return {
        corpo: { usuario: publicoUsuario(inicial), primeiroAcesso: true },
        cookies: [cookieSessao(criarToken(inicial, ctx.segredo), { seguro: ctx.producao })],
      }
    }
  }
  const usuario = dados.admin.usuarios.find((u) => u.email === email)
  const ok = await conferirSenha(senha, usuario?.senhaHash)
  if (!usuario || !ok) throw new ErroHttp(401, 'E-mail ou senha incorretos.')
  return {
    corpo: { usuario: publicoUsuario(usuario) },
    cookies: [cookieSessao(criarToken(usuario, ctx.segredo), { seguro: ctx.producao })],
  }
}

export async function logout(_req, ctx) {
  return { corpo: { ok: true }, cookies: [cookieSaida({ seguro: ctx.producao })] }
}

export async function eu(req, ctx) {
  return { corpo: { usuario: publicoUsuario(await exigirLogin(req, ctx)) } }
}

export async function trocarSenha(req, ctx) {
  const usuario = await exigirLogin(req, ctx)
  const { senhaAtual, novaSenha } = req.corpo || {}
  if (!(await conferirSenha(senhaAtual, usuario.senhaHash))) throw new ErroHttp(400, 'A senha atual está incorreta.')
  const problema = validarNovaSenha(novaSenha)
  if (problema) throw new ErroHttp(400, problema)
  if (novaSenha === senhaAtual) throw new ErroHttp(400, 'A nova senha deve ser diferente da atual.')
  const senhaHash = await gerarHash(novaSenha)

  const atualizado = await transacao(ctx.arm, ['admin'], (dados) => {
    const u = dados.admin.usuarios.find((x) => x.email === usuario.email)
    if (!u) throw new ErroHttp(401, 'Sua sessão expirou. Entre novamente.')
    u.senhaHash = senhaHash
    u.atualizadoEm = new Date().toISOString()
    return { resposta: u, gravar: ['admin'], mensagem: 'troca de senha' }
  })
  return {
    corpo: { ok: true },
    cookies: [cookieSessao(criarToken(atualizado, ctx.segredo), { seguro: ctx.producao })],
  }
}

/** Cria ou redefine um administrador (usado pelo comando npm run criar-admin). */
export async function salvarAdministrador(arm, { email, nome, senha }) {
  const e = v.email(email)
  const n = v.texto(nome, 'o nome', { max: 80 })
  const problema = validarNovaSenha(senha)
  if (problema) throw new ErroHttp(400, problema)
  const senhaHash = await gerarHash(senha)
  return transacao(arm, ['admin'], (dados) => {
    const agora = new Date().toISOString()
    const existente = dados.admin.usuarios.find((u) => u.email === e)
    if (existente) Object.assign(existente, { nome: n, senhaHash, atualizadoEm: agora })
    else dados.admin.usuarios.push({ email: e, nome: n, senhaHash, criadoEm: agora, atualizadoEm: agora })
    return { resposta: { criado: !existente }, gravar: ['admin'], mensagem: `administrador ${e}` }
  })
}
