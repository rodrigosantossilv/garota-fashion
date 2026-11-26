import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { analisarPlanilha, exportarPlanilha, modeloPlanilha } from '../lib/planilha.js'
import { novaLoja } from './ajuda.js'

const categorias = [{ slug: 'blusas', nome: 'Blusas', ordem: 1 }]
const base = () => [
  { codigo: 'GF-0001', nome: 'Blusa Ciganinha', preco: 59.9, categoria: 'blusas', ativo: true,
    tamanhos: [{ tamanho: 'P', quantidade: 2 }, { tamanho: 'M', quantidade: 0 }] },
  { codigo: 'GF-0002', nome: 'Calça Balonê', preco: 129.9, categoria: 'blusas', ativo: true,
    tamanhos: [{ tamanho: '38', quantidade: 4 }] },
]

async function planilha(linhas, cabecalho = ['Código', 'Nome', 'Categoria', 'Tamanho', 'Preço', 'Quantidade']) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Estoque')
  ws.addRow(cabecalho)
  linhas.forEach((l) => ws.addRow(l))
  return Buffer.from(await wb.xlsx.writeBuffer())
}

describe('exportação e reimportação', () => {
  it('o arquivo exportado é reimportado sem nenhuma alteração ou perda', async () => {
    const produtos = base()
    const buf = await exportarPlanilha(produtos, categorias)
    const r = await analisarPlanilha(buf, produtos)
    expect(r.erro).toBeUndefined()
    expect(r.linhasLidas).toBe(3)
    expect(r.semAlteracao).toBe(3)
    expect(r.alteracoes).toEqual([])
    expect(r.ignoradas).toEqual([])
  })
})

describe('importação', () => {
  it('detecta mudanças de preço e quantidade (aceita "R$ 1.299,90" e texto)', async () => {
    const buf = await planilha([
      ['GF-0001', '', '', 'P', 'R$ 64,90', 5],
      ['GF-0001', '', '', 'm', '64,90', '1'],
      ['GF-0002', '', '', 38, 129.9, 4],
    ])
    const r = await analisarPlanilha(buf, base())
    expect(r.ignoradas).toEqual([])
    expect(r.semAlteracao).toBe(1)
    expect(r.alteracoes).toEqual([
      expect.objectContaining({ linha: 2, codigo: 'GF-0001', tamanho: 'P', precoDepois: 64.9, quantidadeAntes: 2, quantidadeDepois: 5 }),
      expect.objectContaining({ linha: 3, codigo: 'GF-0001', tamanho: 'M', precoDepois: 64.9, quantidadeDepois: 1 }),
    ])
  })

  it('ignora linhas inválidas e informa o motivo de cada uma', async () => {
    const buf = await planilha([
      ['GF-9999', '', '', 'P', 10, 1], // 2: código inexistente
      ['GF-0001', '', '', 'GG', 10, 1], // 3: tamanho não cadastrado
      ['GF-0001', '', '', 'P', 'abc', 1], // 4: preço inválido
      ['GF-0001', '', '', 'P', 59.9, -2], // 5: quantidade negativa
      ['GF-0001', '', '', 'P', 59.9, 2.5], // 6: quantidade fracionada
      ['GF-0001', '', '', 'P', 59.9, 3], // 7: válida
      ['GF-0001', '', '', 'P', 59.9, 4], // 8: repetida
      ['GF-0001', '', '', 'M', 70, 1], // 9: preço diferente do mesmo produto
      ['', '', '', '', '', ''], // vazia: pulada em silêncio
      ['', '', '', 'P', 10, 1], // 11: código em branco
    ])
    const r = await analisarPlanilha(buf, base())
    expect(r.alteracoes.map((a) => a.linha)).toEqual([7])
    const motivos = Object.fromEntries(r.ignoradas.map((i) => [i.linha, i.motivo]))
    expect(Object.keys(motivos).map(Number)).toEqual([2, 3, 4, 5, 6, 8, 9, 11])
    expect(motivos[2]).toMatch(/Código não encontrado/)
    expect(motivos[3]).toMatch(/tamanho "GG" não está cadastrado/)
    expect(motivos[4]).toMatch(/Preço inválido/)
    expect(motivos[5]).toMatch(/Quantidade inválida/)
    expect(motivos[6]).toMatch(/Quantidade inválida/)
    expect(motivos[8]).toMatch(/repetida.*linha 7/)
    expect(motivos[9]).toMatch(/Preço diferente.*linha 7/)
    expect(motivos[11]).toMatch(/Nome em branco/)
  })

  it('recusa planilha sem as colunas obrigatórias', async () => {
    const r = await analisarPlanilha(await planilha([['GF-0001', 1]], ['Código', 'Estoque']), base())
    expect(r.erro).toMatch(/Tamanho, Preço, Quantidade/)
  })

  it('recusa arquivo que não é .xlsx', async () => {
    const r = await analisarPlanilha(Buffer.from('não sou planilha'), base())
    expect(r.erro).toMatch(/formato \.xlsx/)
  })
})

const COLS = ['Código', 'Nome', 'Cor', 'Tamanho', 'Preço', 'Quantidade']

describe('peças novas pela planilha', () => {
  it('linhas sem código viram peças novas agrupadas por nome + cor', async () => {
    const buf = await planilha([
      ['', 'Saia Curta', 'Branca', 'P', '49,90', 3],
      ['', 'saia  curta', 'branca', 'M', 49.9, 2], // mesma peça (maiúsculas/espaços não importam)
      ['', 'Saia Curta', 'Azul', 'M', 49.9, 4], // outra cor = outra peça
      ['', 'Body', '', 'ÚNICO', 35, 0], // cor é opcional
    ], COLS)
    const r = await analisarPlanilha(buf, base())
    expect(r.ignoradas).toEqual([])
    expect(r.novos).toEqual([
      { nome: 'Saia Curta', cor: 'Branca', preco: 49.9, linhas: [2, 3], tamanhos: [{ tamanho: 'P', quantidade: 3 }, { tamanho: 'M', quantidade: 2 }] },
      { nome: 'Saia Curta', cor: 'Azul', preco: 49.9, linhas: [4], tamanhos: [{ tamanho: 'M', quantidade: 4 }] },
      { nome: 'Body', cor: '', preco: 35, linhas: [5], tamanhos: [{ tamanho: 'ÚNICO', quantidade: 0 }] },
    ])
  })

  it('ignora peça nova repetida, com tamanho repetido, preço divergente ou que já existe', async () => {
    const produtos = [...base(), { codigo: 'GF-0003', nome: 'Saia Curta', cor: 'Rosa', preco: 40, tamanhos: [{ tamanho: 'P', quantidade: 1 }] }]
    const buf = await planilha([
      ['', 'Saia Curta', 'Branca', 'P', 49.9, 3], // 2 ok
      ['', 'Saia Curta', 'Branca', 'P', 49.9, 1], // 3 tamanho repetido
      ['', 'Saia Curta', 'Branca', 'M', 55, 1], // 4 preço diferente
      ['', 'SAIA CURTA', 'rosa', 'M', 40, 1], // 5 já existe (GF-0003)
      ['', '', 'Azul', 'M', 40, 1], // 6 sem nome
    ], COLS)
    const r = await analisarPlanilha(buf, produtos)
    expect(r.novos).toHaveLength(1)
    const motivos = Object.fromEntries(r.ignoradas.map((i) => [i.linha, i.motivo]))
    expect(motivos[3]).toMatch(/Tamanho P repetido.*linha 2/)
    expect(motivos[4]).toMatch(/Preço diferente.*linha 2/)
    expect(motivos[5]).toMatch(/Já existe a peça "Saia Curta - Rosa" \(GF-0003\)/)
    expect(motivos[6]).toMatch(/Nome em branco/)
  })

  it('o modelo em branco tem as colunas certas e é aceito na importação', async () => {
    const r = await analisarPlanilha(await modeloPlanilha(), base())
    expect(r.erro).toBeUndefined()
    expect(r.linhasLidas).toBe(0)
  })
})

describe('importação pelo painel', () => {
  let loja
  beforeEach(async () => {
    loja = await novaLoja()
    await loja.entrar()
    await loja.chamar('POST', 'categorias', { corpo: { nome: 'Blusas' } })
    await loja.chamar('POST', 'produtos', {
      corpo: { nome: 'Blusa', preco: 50, categoria: 'blusas', tamanhos: [{ tamanho: 'P', quantidade: 1 }, { tamanho: 'M', quantidade: 2 }] },
    })
  })
  afterEach(() => loja.fechar())

  it('pré-visualiza sem gravar, confirma e registra as linhas ignoradas', async () => {
    const buf = await planilha([['GF-0001', '', '', 'P', 55, 0], ['GF-0404', '', '', 'P', 1, 1]])
    const arquivo = buf.toString('base64')

    const previa = await loja.chamar('POST', 'planilha/importar', { corpo: { arquivo, nomeArquivo: 'estoque.xlsx' } })
    expect(previa.status).toBe(200)
    expect(previa.corpo.previa.alteracoes).toHaveLength(1)
    expect((await loja.chamar('GET', 'painel')).corpo.produtos[0].preco).toBe(50) // nada gravado ainda

    const fim = await loja.chamar('POST', 'planilha/importar', { corpo: { arquivo, nomeArquivo: 'estoque.xlsx', confirmar: true } })
    expect(fim.status).toBe(200)
    const painel = (await loja.chamar('GET', 'painel')).corpo
    expect(painel.produtos[0].preco).toBe(55)
    expect(painel.produtos[0].tamanhos[0].quantidade).toBe(0)
    expect(painel.importacoes[0]).toMatchObject({ arquivo: 'estoque.xlsx', alteradas: 1, ignoradas: [expect.objectContaining({ linha: 3 })] })
  })

  it('cria as peças novas como rascunho (sem categoria, sem foto, fora da loja)', async () => {
    const buf = await planilha([['', 'Saia Curta', 'Branca', 'P', 49.9, 3], ['', 'Saia Curta', 'Branca', 'M', 49.9, 2]], COLS)
    const r = await loja.chamar('POST', 'planilha/importar', { corpo: { arquivo: buf.toString('base64'), confirmar: true } })
    expect(r.status).toBe(200)
    expect(r.corpo.resultado.criados).toHaveLength(1)
    const novo = (await loja.chamar('GET', 'painel')).corpo.produtos.find((p) => p.nome === 'Saia Curta')
    expect(novo).toMatchObject({ codigo: 'GF-0002', cor: 'Branca', categoria: null, rascunho: true, imagem: null,
      tamanhos: [{ tamanho: 'P', quantidade: 3 }, { tamanho: 'M', quantidade: 2 }] })

    // importar a mesma planilha de novo não duplica
    const de_novo = await loja.chamar('POST', 'planilha/importar', { corpo: { arquivo: buf.toString('base64') } })
    expect(de_novo.corpo.previa.novos).toEqual([])
    expect(de_novo.corpo.previa.ignoradas).toHaveLength(2)
  })

  it('exporta pelo painel e reimporta sem perda', async () => {
    const exp = await loja.chamar('GET', 'planilha/exportar')
    expect(exp.headers['Content-Type']).toMatch(/spreadsheetml/)
    const antes = (await loja.chamar('GET', 'painel')).corpo.produtos
    const fim = await loja.chamar('POST', 'planilha/importar', { corpo: { arquivo: exp.binario.toString('base64'), confirmar: true } })
    expect(fim.corpo.resultado.alteracoes).toEqual([])
    expect(fim.corpo.resultado.ignoradas).toEqual([])
    expect((await loja.chamar('GET', 'painel')).corpo.produtos).toEqual(antes)
  })
})
