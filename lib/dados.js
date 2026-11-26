import { ErroConflito, ErroHttp } from './erros.js'

/** Arquivos JSON que formam o "banco" do catálogo. */
export const ARQUIVOS = {
  produtos: { caminho: 'dados/produtos.json', padrao: () => [] },
  categorias: { caminho: 'dados/categorias.json', padrao: () => [] },
  config: {
    caminho: 'dados/config.json',
    padrao: () => ({ limiteEstoqueBaixo: 3, whatsapp: '', instagram: '', proximoCodigo: 1 }),
  },
  admin: { caminho: 'dados/admin.json', padrao: () => ({ usuarios: [] }) },
  importacoes: { caminho: 'dados/importacoes.json', padrao: () => [] },
}

export const PASTA_IMAGENS = 'public/produtos'

export async function lerJson(arm, chave, versao) {
  const { caminho, padrao } = ARQUIVOS[chave]
  const buf = await arm.lerArquivo(caminho, versao)
  if (!buf) return padrao()
  try {
    return JSON.parse(buf.toString('utf8'))
  } catch {
    throw new ErroHttp(500, `O arquivo ${caminho} está corrompido (JSON inválido).`)
  }
}

/** Lê os arquivos pedidos numa mesma versão do repositório. */
export async function carregar(arm, chaves = Object.keys(ARQUIVOS), versao) {
  const v = versao ?? (await arm.versaoAtual())
  const valores = await Promise.all(chaves.map((c) => lerJson(arm, c, v)))
  const dados = Object.fromEntries(chaves.map((c, i) => [c, valores[i]]))
  return { dados, versao: v }
}

export function serializar(valor) {
  return JSON.stringify(valor, null, 2) + '\n'
}

/**
 * Lê os dados, aplica `operacao` e grava tudo num único commit.
 * `operacao(dados)` altera `dados` e devolve:
 *   { resposta, gravar: ['produtos', ...], arquivos: [{caminho, conteudo}|{caminho, remover}], mensagem }
 * Se outra gravação acontecer no meio, a operação é refeita sobre os dados novos.
 */
export async function transacao(arm, chaves, operacao, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    const { dados, versao } = await carregar(arm, chaves)
    const r = (await operacao(dados)) || {}
    const arquivos = [
      ...(r.gravar || []).map((c) => ({ caminho: ARQUIVOS[c].caminho, conteudo: serializar(dados[c]) })),
      ...(r.arquivos || []),
    ]
    if (arquivos.length === 0) return r.resposta
    try {
      await arm.gravar({ arquivos, mensagem: `painel: ${r.mensagem || 'atualiza dados'}`, versaoBase: versao })
      return r.resposta
    } catch (e) {
      if (e instanceof ErroConflito) continue
      throw e
    }
  }
  throw new ErroHttp(409, 'Os dados foram alterados em outro lugar ao mesmo tempo. Atualize a página e tente novamente.')
}
