import { describe, expect, it, vi } from 'vitest'
import { criarArmazenamentoGithub } from '../lib/armazenamento/github.js'
import { transacao } from '../lib/dados.js'

/** Simula a API do GitHub o suficiente para ler e gravar arquivos com commits. */
function githubFalso({ conflitosIniciais = 0 } = {}) {
  const arquivos = { 'dados/produtos.json': '[]\n' }
  let head = 'c0'
  let n = 0
  let conflitos = conflitosIniciais
  const blobs = {}
  const commits = { c0: { tree: { sha: 't0' } } }
  const log = []
  const json = (corpo, status = 200) => ({ ok: status < 300, status, json: async () => corpo, arrayBuffer: async () => Buffer.from(JSON.stringify(corpo)) })

  const fetchFn = vi.fn(async (url, opts) => {
    const caminho = url.replace('https://api.github.com/repos/dona/loja', '')
    const corpo = opts.body ? JSON.parse(opts.body) : null
    log.push(`${opts.method} ${caminho.split('?')[0]}`)
    if (caminho.startsWith('/git/ref/heads/')) return json({ object: { sha: head } })
    if (caminho.startsWith('/contents/')) {
      const p = decodeURIComponent(caminho.slice(10).split('?')[0])
      if (!(p in arquivos)) return json({}, 404)
      return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(arquivos[p]) }
    }
    if (caminho.startsWith('/git/commits/')) return json(commits[caminho.slice(13)])
    if (caminho === '/git/blobs') {
      const sha = `b${++n}`
      blobs[sha] = Buffer.from(corpo.content, 'base64').toString('utf8')
      return json({ sha }, 201)
    }
    if (caminho === '/git/trees') return json({ sha: `t${++n}`, itens: corpo.tree }, 201)
    if (caminho === '/git/commits') {
      const sha = `c${++n}`
      commits[sha] = { tree: { sha: corpo.tree }, parents: corpo.parents, message: corpo.message, itens: fetchFn.ultimaArvore }
      return json({ sha }, 201)
    }
    if (caminho.startsWith('/git/refs/heads/')) {
      if (conflitos > 0) {
        conflitos--
        head = `externo${conflitos}` // alguém gravou antes
        commits[head] = { tree: { sha: 'tx' } }
        return json({ message: 'Update is not a fast forward' }, 422)
      }
      head = corpo.sha
      return json({ object: { sha: head } })
    }
    return json({}, 404)
  })
  return { fetchFn, log, blobs, get head() { return head }, commits }
}

describe('armazenamento no GitHub', () => {
  it('grava vários arquivos num único commit e lê de volta', async () => {
    const gh = githubFalso()
    const arm = criarArmazenamentoGithub({ token: 't', repo: 'dona/loja', branch: 'main', fetchFn: gh.fetchFn })
    await transacao(arm, ['produtos'], (d) => {
      d.produtos.push({ codigo: 'GF-0001' })
      return { gravar: ['produtos'], arquivos: [{ caminho: 'public/produtos/a.webp', conteudo: Buffer.from('img') }], mensagem: 'teste' }
    })
    expect(gh.log.filter((l) => l === 'POST /git/commits')).toHaveLength(1)
    expect(Object.values(gh.blobs)).toEqual(['[\n  {\n    "codigo": "GF-0001"\n  }\n]\n', 'img'])
    expect(gh.commits[gh.head].message).toBe('painel: teste')
    expect(gh.commits[gh.head].parents).toEqual(['c0'])
    const patch = gh.fetchFn.mock.calls.find(([u, o]) => o.method === 'PATCH')
    expect(JSON.parse(patch[1].body).force).toBe(false)
  })

  it('refaz a operação quando outra gravação acontece ao mesmo tempo', async () => {
    const gh = githubFalso({ conflitosIniciais: 1 })
    const arm = criarArmazenamentoGithub({ token: 't', repo: 'dona/loja', fetchFn: gh.fetchFn })
    let execucoes = 0
    await transacao(arm, ['produtos'], (d) => {
      execucoes++
      return { gravar: ['produtos'], mensagem: 'x' }
    })
    expect(execucoes).toBe(2)
    expect(gh.commits[gh.head].parents).toEqual(['externo0'])
  })

  it('mensagem clara quando o token é recusado', async () => {
    const arm = criarArmazenamentoGithub({
      token: 't', repo: 'dona/loja',
      fetchFn: async () => ({ ok: false, status: 401, json: async () => ({}) }),
    })
    await expect(arm.versaoAtual()).rejects.toThrow(/GITHUB_TOKEN/)
  })
  it('mensagem clara quando o token não enxerga o repositório (404)', async () => {
    const arm = criarArmazenamentoGithub({
      token: 't', repo: 'dona/loja', branch: 'main',
      fetchFn: async () => ({ ok: false, status: 404, json: async () => ({}) }),
    })
    await expect(arm.versaoAtual()).rejects.toThrow(/não encontrou o repositório dona\/loja.*Contents: Read and write/)
  })
})
