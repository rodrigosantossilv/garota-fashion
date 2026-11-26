import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ADMIN, novaLoja, SEGREDO } from './ajuda.js'
import { criarToken, lerToken } from '../lib/sessao.js'

let loja
beforeEach(async () => (loja = await novaLoja()))
afterEach(() => loja.fechar())

describe('senha armazenada', () => {
  it('nunca fica em texto puro no arquivo', () => {
    const bruto = readFileSync(path.join(loja.raiz, 'dados/admin.json'), 'utf8')
    expect(bruto).not.toContain(ADMIN.senha)
    const { usuarios } = JSON.parse(bruto)
    expect(usuarios[0].senhaHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/) // formato bcrypt
  })

  it('recusa senha curta ao criar administrador', async () => {
    const { salvarAdministrador } = await import('../lib/rotas/auth.js')
    await expect(salvarAdministrador(loja.arm, { email: 'a@b.com', nome: 'X', senha: '123' })).rejects.toThrow(/8 caracteres/)
  })
})

describe('login', () => {
  it('entra com e-mail e senha corretos e recebe cookie httpOnly', async () => {
    const r = await loja.entrar()
    expect(r.status).toBe(200)
    expect(r.corpo.usuario).toEqual({ email: ADMIN.email, nome: ADMIN.nome })
    expect(r.cookies[0]).toMatch(/HttpOnly/)
    expect(r.cookies[0]).toMatch(/SameSite=Strict/)
    expect(JSON.stringify(r.corpo)).not.toContain('senhaHash')
  })

  it('aceita e-mail com maiúsculas e espaços', async () => {
    expect((await loja.entrar('  DONA@GarotaFashion.com ')).status).toBe(200)
  })

  it('recusa senha errada e e-mail inexistente com a mesma mensagem', async () => {
    const a = await loja.entrar(ADMIN.email, 'errada123')
    const b = await loja.entrar('ninguem@x.com', ADMIN.senha)
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(a.corpo.erro).toBe('E-mail ou senha incorretos.')
    expect(b.corpo.erro).toBe(a.corpo.erro)
  })
})

describe('rotas protegidas', () => {
  const protegidas = [
    ['GET', 'painel'],
    ['POST', 'categorias'],
    ['PUT', 'categorias'],
    ['DELETE', 'categorias'],
    ['POST', 'produtos'],
    ['PUT', 'produtos'],
    ['DELETE', 'produtos'],
    ['PATCH', 'estoque'],
    ['PUT', 'config'],
    ['GET', 'planilha/exportar'],
    ['POST', 'planilha/importar'],
    ['GET', 'arquivo'],
    ['GET', 'auth/eu'],
    ['POST', 'auth/senha'],
  ]
  it.each(protegidas)('%s %s exige login', async (metodo, rota) => {
    const r = await loja.chamar(metodo, rota, { semCookie: true, corpo: {} })
    expect(r.status).toBe(401)
  })

  it('recusa cookie adulterado', async () => {
    await loja.entrar()
    const [payload, assinatura] = loja.cookies.gf_sessao.split('.')
    const falso = Buffer.from(JSON.stringify({ e: ADMIN.email, h: 'x', x: Date.now() * 2 })).toString('base64url')
    loja.cookies.gf_sessao = `${falso}.${assinatura}`
    expect((await loja.chamar('GET', 'painel')).status).toBe(401)
    loja.cookies.gf_sessao = `${payload}.${assinatura}`
    expect((await loja.chamar('GET', 'painel')).status).toBe(200)
  })

  it('recusa sessão expirada', () => {
    const token = criarToken({ email: ADMIN.email, senhaHash: 'x' }, SEGREDO, Date.now() - 8 * 24 * 3600 * 1000)
    expect(lerToken(token, SEGREDO)).toBeNull()
  })

  it('recusa alterações sem o cabeçalho do painel (proteção CSRF)', async () => {
    await loja.entrar()
    const r = await loja.chamar('POST', 'categorias', { corpo: { nome: 'Blusas' }, semCabecalho: true })
    expect(r.status).toBe(403)
  })

  it('logout apaga o cookie', async () => {
    await loja.entrar()
    const r = await loja.chamar('POST', 'auth/logout')
    expect(r.cookies[0]).toMatch(/Max-Age=0/)
  })
})

describe('troca de senha', () => {
  it('exige a senha atual correta', async () => {
    await loja.entrar()
    const r = await loja.chamar('POST', 'auth/senha', { corpo: { senhaAtual: 'errada', novaSenha: 'novaSenha456' } })
    expect(r.status).toBe(400)
  })

  it('troca a senha, invalida sessões antigas e mantém a sessão atual', async () => {
    await loja.entrar()
    const cookieAntigo = loja.cookies.gf_sessao
    const r = await loja.chamar('POST', 'auth/senha', { corpo: { senhaAtual: ADMIN.senha, novaSenha: 'novaSenha456' } })
    expect(r.status).toBe(200)
    expect((await loja.chamar('GET', 'painel')).status).toBe(200) // sessão renovada

    loja.cookies.gf_sessao = cookieAntigo
    expect((await loja.chamar('GET', 'painel')).status).toBe(401) // sessão antiga caiu

    loja.limparCookies()
    expect((await loja.entrar(ADMIN.email, ADMIN.senha)).status).toBe(401)
    expect((await loja.entrar(ADMIN.email, 'novaSenha456')).status).toBe(200)
    expect(readFileSync(path.join(loja.raiz, 'dados/admin.json'), 'utf8')).not.toContain('novaSenha456')
  })
})

describe('primeiro acesso pela Vercel (ADMIN_INICIAL_*)', () => {
  const env = { ADMIN_INICIAL_EMAIL: 'Dona@Loja.com', ADMIN_INICIAL_SENHA: 'senhaInicial123' }

  it('cria o administrador no primeiro login, guardando só o hash', async () => {
    const l = await novaLoja({ comAdmin: false, env })
    expect((await l.entrar('dona@loja.com', 'errada')).status).toBe(401)
    const r = await l.entrar('dona@loja.com', 'senhaInicial123')
    expect(r.status).toBe(200)
    expect(r.corpo.primeiroAcesso).toBe(true)
    expect((await l.chamar('GET', 'painel')).status).toBe(200)
    const bruto = readFileSync(path.join(l.raiz, 'dados/admin.json'), 'utf8')
    expect(bruto).not.toContain('senhaInicial123')
    l.fechar()
  })

  it('é ignorado quando já existe administrador', async () => {
    const l = await novaLoja({ env })
    expect((await l.entrar('dona@loja.com', 'senhaInicial123')).status).toBe(401)
    l.fechar()
  })

  it('não funciona sem as variáveis', async () => {
    const l = await novaLoja({ comAdmin: false })
    expect((await l.entrar('dona@loja.com', 'senhaInicial123')).status).toBe(401)
    l.fechar()
  })
})
