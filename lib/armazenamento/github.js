import { ErroConflito, ErroHttp } from '../erros.js'

/**
 * Armazenamento no próprio repositório do GitHub (produção).
 * Cada gravação vira UM commit com todos os arquivos alterados.
 * A gravação só avança o branch se ninguém mais tiver gravado desde a leitura
 * (force: false); caso contrário lança ErroConflito para a operação ser refeita.
 */
export function criarArmazenamentoGithub({ token, repo, branch = 'main', fetchFn = globalThis.fetch }) {
  if (!token || !repo) {
    throw new ErroHttp(500, 'Configuração ausente: defina GITHUB_TOKEN e GITHUB_REPO para gravar no GitHub.')
  }
  const base = `https://api.github.com/repos/${repo}`

  async function api(caminho, { metodo = 'GET', corpo, aceitar = 'application/vnd.github+json' } = {}) {
    const resp = await fetchFn(base + caminho, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: aceitar,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'garota-fashion-painel',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    })
    return resp
  }

  async function exigirOk(resp, acao) {
    if (resp.ok) return resp
    if (resp.status === 404) {
      throw new ErroHttp(
        500,
        `O GitHub não encontrou o repositório ${repo} (branch ${branch}). Verifique se o GITHUB_TOKEN tem acesso a este repositório com a permissão "Contents: Read and write", e se GITHUB_REPO e GITHUB_BRANCH estão corretos.`,
      )
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new ErroHttp(500, `O GitHub recusou o acesso ao ${acao}. Verifique se o GITHUB_TOKEN é válido e tem permissão de escrita neste repositório.`)
    }
    throw new ErroHttp(502, `Falha ao comunicar com o GitHub (${acao}, status ${resp.status}). Tente novamente em instantes.`)
  }

  return {
    tipo: 'github',

    async versaoAtual() {
      const resp = await exigirOk(await api(`/git/ref/heads/${encodeURIComponent(branch)}`), 'ler o branch')
      return (await resp.json()).object.sha
    },

    async lerArquivo(caminho, versao) {
      const ref = versao || branch
      const resp = await api(`/contents/${caminho.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, {
        aceitar: 'application/vnd.github.raw+json',
      })
      if (resp.status === 404) return null
      await exigirOk(resp, `ler ${caminho}`)
      return Buffer.from(await resp.arrayBuffer())
    },

    async gravar({ arquivos, mensagem, versaoBase }) {
      const commitBase = await (await exigirOk(await api(`/git/commits/${versaoBase}`), 'ler o commit')).json()

      const itens = []
      for (const arq of arquivos) {
        if (arq.remover) {
          itens.push({ path: arq.caminho, mode: '100644', type: 'blob', sha: null })
          continue
        }
        const conteudo = Buffer.isBuffer(arq.conteudo) ? arq.conteudo : Buffer.from(arq.conteudo, 'utf8')
        const blob = await (
          await exigirOk(
            await api('/git/blobs', { metodo: 'POST', corpo: { content: conteudo.toString('base64'), encoding: 'base64' } }),
            'enviar arquivo',
          )
        ).json()
        itens.push({ path: arq.caminho, mode: '100644', type: 'blob', sha: blob.sha })
      }

      const arvore = await (
        await exigirOk(await api('/git/trees', { metodo: 'POST', corpo: { base_tree: commitBase.tree.sha, tree: itens } }), 'montar a árvore')
      ).json()
      const commit = await (
        await exigirOk(
          await api('/git/commits', { metodo: 'POST', corpo: { message: mensagem, tree: arvore.sha, parents: [versaoBase] } }),
          'criar o commit',
        )
      ).json()

      const resp = await api(`/git/refs/heads/${encodeURIComponent(branch)}`, {
        metodo: 'PATCH',
        corpo: { sha: commit.sha, force: false },
      })
      if (resp.status === 422 || resp.status === 409) throw new ErroConflito()
      await exigirOk(resp, 'atualizar o branch')
      return commit.sha
    },
  }
}
