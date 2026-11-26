import ExcelJS from 'exceljs'
import { interpretarPreco, interpretarQuantidade, normalizarTamanho, normalizarTexto } from './validacao.js'

export const LIMITE_ARQUIVO = 2 * 1024 * 1024
const OBRIGATORIAS = { codigo: 'Código', tamanho: 'Tamanho', preco: 'Preço', quantidade: 'Quantidade' }
const OPCIONAIS = { nome: 'Nome', cor: 'Cor' }
const COR_CABECALHO = 'FFC9245F'

/** Peças são identificadas por nome + cor (sem diferenciar acentos e maiúsculas). */
export const chavePeca = (nome, cor) => `${normalizarTexto(nome)}|${normalizarTexto(cor)}`

function estilizarCabecalho(ws) {
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_CABECALHO } }
}

const colunasBase = (comCategoria) => [
  { header: 'Código', key: 'codigo', width: 12 },
  { header: 'Nome', key: 'nome', width: 34 },
  { header: 'Cor', key: 'cor', width: 14 },
  ...(comCategoria ? [{ header: 'Categoria (definida no painel)', key: 'categoria', width: 26 }] : []),
  { header: 'Tamanho', key: 'tamanho', width: 10 },
  { header: 'Preço', key: 'preco', width: 12, style: { numFmt: '"R$" #,##0.00' } },
  { header: 'Quantidade', key: 'quantidade', width: 12 },
]

/** Exporta uma linha por produto e tamanho. */
export async function exportarPlanilha(produtos, categorias) {
  const nomes = Object.fromEntries(categorias.map((c) => [c.slug, c.nome]))
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Garota Fashion'
  const ws = wb.addWorksheet('Estoque', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = colunasBase(true)
  estilizarCabecalho(ws)
  for (const p of produtos) {
    for (const t of p.tamanhos) {
      ws.addRow({
        codigo: p.codigo,
        nome: p.nome,
        cor: p.cor || '',
        categoria: p.categoria ? nomes[p.categoria] || p.categoria : '',
        tamanho: t.tamanho,
        preco: p.preco,
        quantidade: t.quantidade,
      })
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

/** Planilha em branco para cadastrar peças novas. */
export async function modeloPlanilha() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Garota Fashion'
  const ws = wb.addWorksheet('Estoque', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = colunasBase(false)
  estilizarCabecalho(ws)
  const ajuda = wb.addWorksheet('Como preencher')
  ajuda.getColumn(1).width = 100
  ;[
    'COMO PREENCHER',
    '',
    '• Uma linha por tamanho. Ex.: Saia Curta, Branca, P  e  Saia Curta, Branca, M.',
    '• Peça NOVA: deixe o Código em branco. Linhas com o mesmo Nome e Cor viram uma peça só, com vários tamanhos.',
    '• Peça que JÁ EXISTE: use o Código (ex.: GF-0001) para atualizar o preço e a quantidade.',
    '• Preço: o mesmo para todos os tamanhos da peça. Pode escrever 49,90 ou R$ 49,90.',
    '• Quantidade: número inteiro (0 = esgotado).',
    '• A categoria e a foto são escolhidas no painel, na hora de adicionar a peça à loja.',
    '• As peças novas entram escondidas, em "Novas peças". A cliente só vê depois que você publicar.',
  ].forEach((t, i) => (ajuda.getCell(`A${i + 1}`).value = t))
  ajuda.getCell('A1').font = { bold: true, color: { argb: COR_CABECALHO } }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

function valorCelula(cel) {
  const v = cel?.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    if ('result' in v) return v.result ?? ''
    if ('richText' in v) return v.richText.map((r) => r.text).join('')
    if ('text' in v) return v.text
    if (v instanceof Date) return v.toISOString()
  }
  return v
}

const limparTexto = (v) => String(v ?? '').trim().replace(/\s+/g, ' ')

/**
 * Lê a planilha e compara com os produtos atuais.
 *  - Linha COM código: atualiza preço e quantidade daquele produto/tamanho.
 *  - Linha SEM código: vira peça nova (agrupada por Nome + Cor), criada como rascunho.
 * Devolve alterações, peças novas e linhas ignoradas com o motivo.
 */
export async function analisarPlanilha(buffer, produtos) {
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer)
  } catch {
    return { erro: 'Não foi possível ler o arquivo. Envie uma planilha do Excel no formato .xlsx.' }
  }
  const ws = wb.worksheets[0]
  if (!ws) return { erro: 'A planilha está vazia.' }

  const indice = {}
  ws.getRow(1).eachCell((cel, col) => {
    const nome = normalizarTexto(valorCelula(cel))
    for (const [chave, rotulo] of Object.entries({ ...OBRIGATORIAS, ...OPCIONAIS })) {
      if (nome === normalizarTexto(rotulo)) indice[chave] = col
    }
  })
  const faltando = Object.entries(OBRIGATORIAS).filter(([k]) => !indice[k]).map(([, r]) => r)
  if (faltando.length) {
    return { erro: `A planilha precisa ter as colunas: ${faltando.join(', ')}. Baixe o modelo no painel e use-o como base.` }
  }

  const porCodigo = new Map(produtos.map((p) => [p.codigo, p]))
  const porPeca = new Map(produtos.map((p) => [chavePeca(p.nome, p.cor), p]))
  const alteracoes = []
  const ignoradas = []
  const novos = new Map() // chavePeca -> peça nova
  const vistos = new Map() // "codigo|tamanho" -> linha
  const precoDaPlanilha = new Map() // codigo -> { preco, linha }
  let linhasLidas = 0
  let semAlteracao = 0

  for (let n = 2; n <= ws.rowCount; n++) {
    const row = ws.getRow(n)
    const ler = (k) => (indice[k] ? valorCelula(row.getCell(indice[k])) : '')
    const bruto = {
      codigo: limparTexto(ler('codigo')).toUpperCase(),
      nome: limparTexto(ler('nome')),
      cor: limparTexto(ler('cor')),
      tamanho: normalizarTamanho(ler('tamanho')),
      preco: ler('preco'),
      quantidade: ler('quantidade'),
    }
    if (!bruto.codigo && !bruto.nome && !bruto.tamanho && bruto.preco === '' && bruto.quantidade === '') continue
    linhasLidas++
    const ignorar = (motivo) =>
      ignoradas.push({ linha: n, codigo: bruto.codigo || '—', nome: bruto.nome || '', tamanho: bruto.tamanho || '—', motivo })

    if (!bruto.tamanho) { ignorar('Tamanho em branco.'); continue }
    if (bruto.tamanho.length > 10) { ignorar('Tamanho com mais de 10 caracteres.'); continue }
    const preco = interpretarPreco(bruto.preco)
    if (preco === null || preco <= 0 || preco > 99999.99) { ignorar('Preço inválido. Use um valor maior que zero, como 59,90.'); continue }
    const qtd = interpretarQuantidade(bruto.quantidade)
    if (qtd === null) { ignorar('Quantidade inválida. Use um número inteiro de 0 a 99999.'); continue }

    // ----- Peça nova (sem código) -----
    if (!bruto.codigo) {
      if (!bruto.nome) { ignorar('Nome em branco. Para cadastrar uma peça nova, preencha o Nome (ou o Código, se ela já existir).'); continue }
      if (bruto.nome.length > 100) { ignorar('Nome com mais de 100 caracteres.'); continue }
      if (bruto.cor.length > 30) { ignorar('Cor com mais de 30 caracteres.'); continue }
      const chave = chavePeca(bruto.nome, bruto.cor)
      const existente = porPeca.get(chave)
      if (existente) {
        ignorar(`Já existe a peça "${existente.nome}${existente.cor ? ` - ${existente.cor}` : ''}" (${existente.codigo}). Para atualizá-la, preencha o Código.`)
        continue
      }
      let peca = novos.get(chave)
      if (!peca) {
        peca = { nome: bruto.nome, cor: bruto.cor, preco, linha: n, linhas: [], tamanhos: [] }
        novos.set(chave, peca)
      }
      const repetido = peca.tamanhos.find((t) => t.tamanho === bruto.tamanho)
      if (repetido) { ignorar(`Tamanho ${bruto.tamanho} repetido para a mesma peça (linha ${repetido.linha}).`); continue }
      if (peca.preco !== preco) { ignorar(`Preço diferente do informado na linha ${peca.linha} para a mesma peça. O preço vale para todos os tamanhos.`); continue }
      if (peca.tamanhos.length >= 20) { ignorar('Uma peça pode ter no máximo 20 tamanhos.'); continue }
      peca.tamanhos.push({ tamanho: bruto.tamanho, quantidade: qtd, linha: n })
      peca.linhas.push(n)
      continue
    }

    // ----- Peça existente (com código) -----
    const produto = porCodigo.get(bruto.codigo)
    if (!produto) { ignorar('Código não encontrado. Para cadastrar uma peça nova, deixe o Código em branco.'); continue }
    const tam = produto.tamanhos.find((t) => t.tamanho === bruto.tamanho)
    if (!tam) { ignorar(`O tamanho "${bruto.tamanho}" não está cadastrado neste produto. Adicione-o pelo painel.`); continue }

    const chave = `${bruto.codigo}|${bruto.tamanho}`
    if (vistos.has(chave)) { ignorar(`Linha repetida: o mesmo código e tamanho já aparecem na linha ${vistos.get(chave)}.`); continue }
    const anterior = precoDaPlanilha.get(bruto.codigo)
    if (anterior && anterior.preco !== preco) {
      ignorar(`Preço diferente do informado na linha ${anterior.linha} para o mesmo produto. O preço vale para todos os tamanhos.`)
      continue
    }
    vistos.set(chave, n)
    if (!anterior) precoDaPlanilha.set(bruto.codigo, { preco, linha: n })

    if (preco === produto.preco && qtd === tam.quantidade) { semAlteracao++; continue }
    alteracoes.push({
      linha: n,
      codigo: produto.codigo,
      nome: produto.nome,
      cor: produto.cor || '',
      tamanho: tam.tamanho,
      precoAntes: produto.preco,
      precoDepois: preco,
      quantidadeAntes: tam.quantidade,
      quantidadeDepois: qtd,
    })
  }

  return {
    linhasLidas,
    semAlteracao,
    alteracoes,
    novos: [...novos.values()].map(({ linha, ...p }) => ({ ...p, tamanhos: p.tamanhos.map(({ linha: _l, ...t }) => t) })),
    ignoradas: ignoradas.sort((a, b) => a.linha - b.linha),
  }
}

/** Aplica as alterações (já validadas) sobre a lista de produtos. */
export function aplicarAlteracoes(produtos, alteracoes, agora = new Date().toISOString()) {
  const porCodigo = new Map(produtos.map((p) => [p.codigo, p]))
  for (const a of alteracoes) {
    const p = porCodigo.get(a.codigo)
    if (!p) continue
    p.preco = a.precoDepois
    const t = p.tamanhos.find((x) => x.tamanho === a.tamanho)
    if (t) t.quantidade = a.quantidadeDepois
    p.atualizadoEm = agora
  }
  return produtos
}

/** Cria as peças novas como RASCUNHO: sem foto, sem categoria e escondidas da loja. */
export function criarPecasNovas(dados, novos, agora = new Date().toISOString()) {
  return novos.map((n) => {
    const numero = dados.config.proximoCodigo || 1
    dados.config.proximoCodigo = numero + 1
    const produto = {
      codigo: `GF-${String(numero).padStart(4, '0')}`,
      nome: n.nome,
      cor: n.cor,
      preco: n.preco,
      categoria: null,
      tamanhos: n.tamanhos,
      ativo: true,
      rascunho: true,
      imagem: null,
      criadoEm: agora,
      atualizadoEm: agora,
    }
    dados.produtos.push(produto)
    return produto
  })
}
