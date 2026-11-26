import { ErroHttp } from '../erros.js'
import { carregar, transacao, PASTA_IMAGENS } from '../dados.js'
import { decodificarImagem, nomeImagem, NOME_IMAGEM_REGEX } from '../imagem.js'
import { analisarPlanilha, aplicarAlteracoes, criarPecasNovas, exportarPlanilha, LIMITE_ARQUIVO, modeloPlanilha } from '../planilha.js'
import * as v from '../validacao.js'

const agora = () => new Date().toISOString()
const caminhoImagem = (urlPublica) => `${PASTA_IMAGENS}/${urlPublica.split('/').pop()}`

// ---------- Leitura geral do painel ----------
export async function painel(_req, ctx) {
  const { dados } = await carregar(ctx.arm, ['produtos', 'categorias', 'config', 'importacoes'])
  const { proximoCodigo, ...config } = dados.config
  return {
    corpo: {
      produtos: dados.produtos,
      categorias: [...dados.categorias].sort((a, b) => a.ordem - b.ordem),
      config,
      importacoes: dados.importacoes.slice(0, 10),
      armazenamento: ctx.arm.tipo,
    },
  }
}

// ---------- Categorias ----------
export async function criarCategoria(req, ctx) {
  const nome = v.texto(req.corpo?.nome, 'o nome da categoria', { max: 40 })
  const slug = v.slug(nome)
  if (!slug) throw new ErroHttp(400, 'Use letras ou números no nome da categoria.')
  const categoria = await transacao(ctx.arm, ['categorias'], (d) => {
    if (d.categorias.some((c) => c.slug === slug || c.nome.toLowerCase() === nome.toLowerCase())) {
      throw new ErroHttp(409, `Já existe uma categoria chamada "${nome}".`)
    }
    const nova = { slug, nome, ordem: d.categorias.reduce((m, c) => Math.max(m, c.ordem), 0) + 1, criadoEm: agora() }
    d.categorias.push(nova)
    return { resposta: nova, gravar: ['categorias'], mensagem: `cria categoria ${nome}` }
  })
  return { status: 201, corpo: { categoria } }
}

export async function editarCategoria(req, ctx) {
  const slug = String(req.query.slug || '')
  const { nome, ordem } = req.corpo || {}
  const categoria = await transacao(ctx.arm, ['categorias'], (d) => {
    const c = d.categorias.find((x) => x.slug === slug)
    if (!c) throw new ErroHttp(404, 'Categoria não encontrada.')
    if (nome !== undefined) {
      const n = v.texto(nome, 'o nome da categoria', { max: 40 })
      if (d.categorias.some((x) => x !== c && x.nome.toLowerCase() === n.toLowerCase())) {
        throw new ErroHttp(409, `Já existe uma categoria chamada "${n}".`)
      }
      c.nome = n // o slug (endereço) continua o mesmo
    }
    if (ordem !== undefined) {
      if (!Number.isInteger(ordem)) throw new ErroHttp(400, 'Ordem inválida.')
      c.ordem = ordem
    }
    return { resposta: c, gravar: ['categorias'], mensagem: `edita categoria ${c.nome}` }
  })
  return { corpo: { categoria } }
}

/**
 * Remove a categoria. Se tiver produtos, exige uma escolha:
 *   ?moverPara=<outra>  move os produtos, ou  ?semCategoria=1  deixa-os sem categoria.
 */
export async function removerCategoria(req, ctx) {
  const slug = String(req.query.slug || '')
  const moverPara = req.query.moverPara ? String(req.query.moverPara) : null
  const semCategoria = req.query.semCategoria === '1'
  const resposta = await transacao(ctx.arm, ['categorias', 'produtos'], (d) => {
    const c = d.categorias.find((x) => x.slug === slug)
    if (!c) throw new ErroHttp(404, 'Categoria não encontrada.')
    const vinculados = d.produtos.filter((p) => p.categoria === slug)
    const gravar = ['categorias']
    if (vinculados.length) {
      if (!moverPara && !semCategoria) {
        throw new ErroHttp(
          409,
          `A categoria "${c.nome}" tem ${vinculados.length} produto(s). Escolha para onde eles vão antes de remover.`,
          { produtosVinculados: vinculados.length },
        )
      }
      const destino = semCategoria ? null : d.categorias.find((x) => x.slug === moverPara && x.slug !== slug)
      if (!semCategoria && !destino) throw new ErroHttp(400, 'Escolha uma categoria de destino válida.')
      for (const p of vinculados) {
        p.categoria = destino ? destino.slug : null
        p.atualizadoEm = agora()
      }
      gravar.push('produtos')
    }
    d.categorias = d.categorias.filter((x) => x !== c)
    return { resposta: { removida: slug, movidos: vinculados.length }, gravar, mensagem: `remove categoria ${c.nome}` }
  })
  return { corpo: resposta }
}

// ---------- Produtos ----------
/** Categoria é opcional (o painel avisa antes de salvar sem categoria). */
function lerCamposProduto(corpo, categorias) {
  const categoria = corpo?.categoria ? String(corpo.categoria) : null
  if (categoria && !categorias.some((c) => c.slug === categoria)) {
    throw new ErroHttp(400, 'A categoria escolhida não existe mais. Escolha outra na lista.')
  }
  return {
    nome: v.texto(corpo?.nome, 'o nome do produto', { max: 100 }),
    cor: v.cor(corpo?.cor),
    preco: v.preco(corpo?.preco),
    categoria,
    tamanhos: v.tamanhos(corpo?.tamanhos),
    ativo: corpo?.ativo !== false,
  }
}

export async function criarProduto(req, ctx) {
  const img = req.corpo?.imagem ? decodificarImagem(req.corpo.imagem) : null
  const produto = await transacao(ctx.arm, ['produtos', 'categorias', 'config'], (d) => {
    const campos = lerCamposProduto(req.corpo, d.categorias)
    const numero = d.config.proximoCodigo || 1
    const codigo = `GF-${String(numero).padStart(4, '0')}`
    d.config.proximoCodigo = numero + 1
    const arquivos = []
    let imagem = null
    if (img) {
      const nome = nomeImagem(codigo, img.ext)
      imagem = `/produtos/${nome}`
      arquivos.push({ caminho: `${PASTA_IMAGENS}/${nome}`, conteudo: img.buf })
    }
    // Sem foto, a peça fica em "Novas peças" (rascunho) até receber uma foto e ser publicada.
    const novo = { codigo, ...campos, imagem, rascunho: !imagem, criadoEm: agora(), atualizadoEm: agora() }
    d.produtos.push(novo)
    return { resposta: novo, gravar: ['produtos', 'config'], arquivos, mensagem: `cadastra ${codigo} ${campos.nome}` }
  })
  return { status: 201, corpo: { produto } }
}

/**
 * imagem: string base64 = trocar; null = remover; ausente = manter.
 * publicar: true = tira do rascunho e mostra na loja (exige foto).
 */
export async function editarProduto(req, ctx) {
  const codigo = v.codigo(String(req.query.codigo || ''))
  const corpo = req.corpo || {}
  const img = typeof corpo.imagem === 'string' ? decodificarImagem(corpo.imagem) : null
  const produto = await transacao(ctx.arm, ['produtos', 'categorias'], (d) => {
    const p = d.produtos.find((x) => x.codigo === codigo)
    if (!p) throw new ErroHttp(404, 'Produto não encontrado.')
    Object.assign(p, lerCamposProduto(corpo, d.categorias))
    const arquivos = []
    if (img || corpo.imagem === null) {
      if (p.imagem) arquivos.push({ caminho: caminhoImagem(p.imagem), remover: true })
      p.imagem = null
      if (img) {
        const nome = nomeImagem(codigo, img.ext)
        p.imagem = `/produtos/${nome}`
        arquivos.push({ caminho: `${PASTA_IMAGENS}/${nome}`, conteudo: img.buf })
      }
    }
    if (corpo.publicar) {
      if (!p.imagem) throw new ErroHttp(400, 'Adicione uma foto antes de colocar a peça na loja.')
      p.rascunho = false
      p.ativo = true
    } else if (!p.rascunho && p.ativo !== false && !p.imagem) {
      throw new ErroHttp(400, 'Uma peça que está na loja precisa de foto. Escolha outra foto ou desmarque "Mostrar na loja".')
    }
    p.atualizadoEm = agora()
    const acao = corpo.publicar ? 'publica' : 'edita'
    return { resposta: p, gravar: ['produtos'], arquivos, mensagem: `${acao} ${codigo} ${p.nome}` }
  })
  return { corpo: { produto } }
}

/** Só troca a foto (botão "Adicionar imagem" da lista de novas peças). */
export async function imagemProduto(req, ctx) {
  const codigo = v.codigo(String(req.query.codigo || ''))
  const img = decodificarImagem(req.corpo?.imagem)
  const produto = await transacao(ctx.arm, ['produtos'], (d) => {
    const p = d.produtos.find((x) => x.codigo === codigo)
    if (!p) throw new ErroHttp(404, 'Produto não encontrado.')
    const arquivos = p.imagem ? [{ caminho: caminhoImagem(p.imagem), remover: true }] : []
    const nome = nomeImagem(codigo, img.ext)
    p.imagem = `/produtos/${nome}`
    p.atualizadoEm = agora()
    arquivos.push({ caminho: `${PASTA_IMAGENS}/${nome}`, conteudo: img.buf })
    return { resposta: p, gravar: ['produtos'], arquivos, mensagem: `foto de ${codigo} ${p.nome}` }
  })
  return { corpo: { produto } }
}

export async function removerProduto(req, ctx) {
  const codigo = v.codigo(String(req.query.codigo || ''))
  await transacao(ctx.arm, ['produtos'], (d) => {
    const p = d.produtos.find((x) => x.codigo === codigo)
    if (!p) throw new ErroHttp(404, 'Produto não encontrado.')
    d.produtos = d.produtos.filter((x) => x !== p)
    const arquivos = p.imagem ? [{ caminho: caminhoImagem(p.imagem), remover: true }] : []
    return { resposta: true, gravar: ['produtos'], arquivos, mensagem: `remove ${codigo} ${p.nome}` }
  })
  return { corpo: { removido: codigo } }
}

// ---------- Estoque (ajustes rápidos, em lote) ----------
export async function ajustarEstoque(req, ctx) {
  const ajustes = req.corpo?.ajustes
  if (!Array.isArray(ajustes) || ajustes.length === 0 || ajustes.length > 500) {
    throw new ErroHttp(400, 'Nenhum ajuste de estoque informado.')
  }
  const validos = ajustes.map((a) => ({
    codigo: v.codigo(a?.codigo),
    tamanho: v.normalizarTamanho(a?.tamanho),
    quantidade: v.quantidade(a?.quantidade),
  }))
  const produtos = await transacao(ctx.arm, ['produtos'], (d) => {
    const alterados = new Map()
    for (const a of validos) {
      const p = d.produtos.find((x) => x.codigo === a.codigo)
      if (!p) throw new ErroHttp(404, `Produto ${a.codigo} não encontrado.`)
      const t = p.tamanhos.find((x) => x.tamanho === a.tamanho)
      if (!t) throw new ErroHttp(404, `O produto ${a.codigo} não tem o tamanho ${a.tamanho}.`)
      t.quantidade = a.quantidade
      p.atualizadoEm = agora()
      alterados.set(p.codigo, p)
    }
    return {
      resposta: [...alterados.values()],
      gravar: ['produtos'],
      mensagem: `ajusta estoque de ${[...alterados.keys()].join(', ')}`,
    }
  })
  return { corpo: { produtos } }
}

// ---------- Configurações ----------
export async function salvarConfig(req, ctx) {
  const c = req.corpo || {}
  const config = await transacao(ctx.arm, ['config'], (d) => {
    if (c.limiteEstoqueBaixo !== undefined) {
      const n = v.interpretarQuantidade(c.limiteEstoqueBaixo)
      if (n === null || n > 1000) throw new ErroHttp(400, 'O limite de estoque baixo deve ser um número inteiro entre 0 e 1000.')
      d.config.limiteEstoqueBaixo = n
    }
    if (c.whatsapp !== undefined) {
      const w = String(c.whatsapp).replace(/\D/g, '')
      if (w && (w.length < 12 || w.length > 13)) {
        throw new ErroHttp(400, 'WhatsApp inválido. Use o código do país e o DDD, por exemplo: 55 75 99999-0000.')
      }
      d.config.whatsapp = w
    }
    if (c.instagram !== undefined) {
      const i = String(c.instagram).trim().replace(/^@/, '')
      if (i && !/^[a-zA-Z0-9._]{1,30}$/.test(i)) throw new ErroHttp(400, 'Usuário do Instagram inválido.')
      d.config.instagram = i
    }
    const { proximoCodigo, ...publico } = d.config
    return { resposta: publico, gravar: ['config'], mensagem: 'atualiza configurações' }
  })
  return { corpo: { config } }
}

// ---------- Planilha ----------
export async function exportar(_req, ctx) {
  const { dados } = await carregar(ctx.arm, ['produtos', 'categorias'])
  const buf = await exportarPlanilha(dados.produtos, dados.categorias)
  const data = new Date().toISOString().slice(0, 10)
  return {
    binario: buf,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="garota-fashion-estoque-${data}.xlsx"`,
    },
  }
}

export async function modelo() {
  return {
    binario: await modeloPlanilha(),
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="garota-fashion-modelo.xlsx"',
    },
  }
}

/** { arquivo: base64, nomeArquivo, confirmar: false } = só pré-visualiza; confirmar: true = grava. */
export async function importar(req, ctx, usuario) {
  const { arquivo, nomeArquivo, confirmar } = req.corpo || {}
  if (typeof arquivo !== 'string' || !arquivo) throw new ErroHttp(400, 'Envie o arquivo da planilha (.xlsx).')
  const buf = Buffer.from(arquivo.replace(/^data:[^;]+;base64,/, ''), 'base64')
  if (buf.length > LIMITE_ARQUIVO) throw new ErroHttp(413, 'A planilha é grande demais (máximo de 2 MB).')

  if (!confirmar) {
    const { dados } = await carregar(ctx.arm, ['produtos'])
    const analise = await analisarPlanilha(buf, dados.produtos)
    if (analise.erro) throw new ErroHttp(400, analise.erro)
    return { corpo: { previa: analise } }
  }

  const resultado = await transacao(ctx.arm, ['produtos', 'importacoes', 'config'], async (d) => {
    // Analisa de novo sobre os dados atuais, para não gravar uma prévia desatualizada.
    const analise = await analisarPlanilha(buf, d.produtos)
    if (analise.erro) throw new ErroHttp(400, analise.erro)
    aplicarAlteracoes(d.produtos, analise.alteracoes)
    const criados = criarPecasNovas(d, analise.novos)
    const registro = {
      data: agora(),
      usuario: usuario.email,
      arquivo: String(nomeArquivo || 'planilha.xlsx').slice(0, 120),
      linhasLidas: analise.linhasLidas,
      alteradas: analise.alteracoes.length,
      criadas: criados.length,
      ignoradas: analise.ignoradas,
    }
    d.importacoes = [registro, ...d.importacoes].slice(0, 30)
    const gravar = ['importacoes']
    if (analise.alteracoes.length || criados.length) gravar.push('produtos')
    if (criados.length) gravar.push('config')
    return {
      resposta: { ...analise, criados, registro },
      gravar,
      mensagem: `importa planilha (${analise.alteracoes.length} alteração(ões), ${criados.length} peça(s) nova(s))`,
    }
  })
  return { corpo: { resultado } }
}

// ---------- Imagem (pré-visualização no painel antes da publicação) ----------
export async function arquivo(req, ctx) {
  const nome = String(req.query.nome || '')
  if (!NOME_IMAGEM_REGEX.test(nome)) throw new ErroHttp(400, 'Arquivo inválido.')
  const buf = await ctx.arm.lerArquivo(`${PASTA_IMAGENS}/${nome}`)
  if (!buf) throw new ErroHttp(404, 'Imagem não encontrada.')
  const tipo = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' }[nome.split('.').pop()]
  return { binario: buf, headers: { 'Content-Type': tipo, 'Cache-Control': 'private, max-age=3600' } }
}
