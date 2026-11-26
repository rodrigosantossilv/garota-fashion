import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { criarArmazenamentoLocal } from '../lib/armazenamento/local.js'
import { tratar } from '../lib/roteador.js'
import { lerCookies } from '../lib/sessao.js'
import { salvarAdministrador } from '../lib/rotas/auth.js'

export const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!!'
export const ADMIN = { email: 'dona@garotafashion.com', nome: 'Dona da Loja', senha: 'senhaForte123' }

/** Cria uma "loja" vazia numa pasta temporária e devolve um cliente da API. */
export async function novaLoja({ comAdmin = true, env = {} } = {}) {
  const raiz = mkdtempSync(path.join(tmpdir(), 'garota-'))
  const arm = criarArmazenamentoLocal(raiz)
  if (comAdmin) await salvarAdministrador(arm, ADMIN)
  let cookies = {}

  async function chamar(metodo, rota, { corpo, query, semCookie = false, semCabecalho = false } = {}) {
    const r = await tratar(
      { metodo, rota, query, corpo, cookies: semCookie ? {} : cookies, cabecalhoPainel: semCabecalho ? undefined : '1' },
      { arm, segredo: SEGREDO, producao: false, env },
    )
    for (const c of r.cookies || []) Object.assign(cookies, lerCookies(c.split(';')[0]))
    return r
  }

  return {
    raiz,
    arm,
    chamar,
    entrar: (email = ADMIN.email, senha = ADMIN.senha) => chamar('POST', 'auth/login', { corpo: { email, senha } }),
    limparCookies: () => (cookies = {}),
    get cookies() { return cookies },
    fechar: () => rmSync(raiz, { recursive: true, force: true }),
  }
}

// PNG 1x1 válido
export const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
