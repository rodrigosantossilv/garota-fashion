import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { catalogoPublico } from '../lib/catalogo.js'
import { estoqueBaixo, resumoEstoque, situacao } from '../lib/situacao.js'
import { novaLoja, PNG_1PX } from './ajuda.js'

const produto = (tamanhos, extra = {}) => ({
  codigo: 'GF-0001', nome: 'Blusa', preco: 50, categoria: 'blusas', tamanhos, ativo: true, imagem: '/produtos/x.webp', ...extra,
})

/** Procura qualquer chave "quantidade" em qualquer nível do objeto. */
const temQuantidade = (obj) => JSON.stringify(obj).match(/quantidade/i) !== null

describe('regra do ESGOTADO', () => {
  it('produto com todos os tamanhos zerados fica esgotado', () => {
    expect(situacao(produto([{ tamanho: 'P', quantidade: 0 }, { tamanho: 'M', quantidade: 0 }]))).toBe('esgotado')
  })
  it('basta um tamanho com estoque para ficar disponível', () => {
    expect(situacao(produto([{ tamanho: 'P', quantidade: 0 }, { tamanho: 'M', quantidade: 1 }]))).toBe('disponivel')
  })
  it('estoque baixo respeita o limite e não conta esgotados', () => {
    expect(estoqueBaixo(produto([{ tamanho: 'P', quantidade: 3 }]), 3)).toBe(true)
    expect(estoqueBaixo(produto([{ tamanho: 'P', quantidade: 4 }]), 3)).toBe(false)
    expect(estoqueBaixo(produto([{ tamanho: 'P', quantidade: 0 }]), 3)).toBe(false)
  })
  it('resumo do dashboard', () => {
    const lista = [
      produto([{ tamanho: 'P', quantidade: 2 }, { tamanho: 'M', quantidade: 3 }], { preco: 10 }),
      produto([{ tamanho: 'P', quantidade: 0 }], { preco: 99 }),
      produto([{ tamanho: 'U', quantidade: 1 }], { preco: 59.9 }),
    ]
    expect(resumoEstoque(lista, 3)).toEqual({ totalProdutos: 3, esgotados: 1, estoqueBaixo: 1, valorEmEstoque: 109.9 })
  })
})

describe('catálogo público (vitrine)', () => {
  const dados = {
    config: { whatsapp: '5575999990000', instagram: 'fashiongarotta', limiteEstoqueBaixo: 3, proximoCodigo: 9 },
    categorias: [{ slug: 'blusas', nome: 'Blusas', ordem: 1 }, { slug: 'vazia', nome: 'Vazia', ordem: 2 }],
    produtos: [
      produto([{ tamanho: 'P', quantidade: 0 }, { tamanho: 'M', quantidade: 4321 }]),
      produto([{ tamanho: 'G', quantidade: 0 }], { codigo: 'GF-0002' }),
      produto([{ tamanho: 'G', quantidade: 5 }], { codigo: 'GF-0003', ativo: false }),
    ],
  }
  const cat = catalogoPublico(dados)

  it('nunca expõe a quantidade', () => {
    expect(temQuantidade(cat)).toBe(false)
    expect(JSON.stringify(cat)).not.toContain('4321')
    expect(JSON.stringify(cat)).not.toContain('proximoCodigo')
  })
  it('marca esgotado e tamanhos indisponíveis', () => {
    expect(cat.produtos.find((p) => p.codigo === 'GF-0002').situacao).toBe('esgotado')
    expect(cat.produtos.find((p) => p.codigo === 'GF-0001').tamanhos).toEqual([
      { tamanho: 'P', disponivel: false },
      { tamanho: 'M', disponivel: true },
    ])
  })
  it('esconde produtos inativos e categorias sem produtos', () => {
    expect(cat.produtos.map((p) => p.codigo)).not.toContain('GF-0003')
    expect(cat.categorias.map((c) => c.slug)).toEqual(['blusas'])
  })
  it('esconde rascunhos e peças sem foto; mostra peça sem categoria', () => {
    const c = catalogoPublico({
      ...dados,
      produtos: [
        produto([{ tamanho: 'P', quantidade: 1 }], { codigo: 'GF-0010', rascunho: true }),
        produto([{ tamanho: 'P', quantidade: 1 }], { codigo: 'GF-0011', imagem: null }),
        produto([{ tamanho: 'P', quantidade: 1 }], { codigo: 'GF-0012', categoria: null, cor: 'Azul' }),
      ],
    })
    expect(c.produtos.map((p) => p.codigo)).toEqual(['GF-0012'])
    expect(c.produtos[0]).toMatchObject({ categoria: null, cor: 'Azul' })
  })
})

describe('fluxo pelo painel', () => {
  let loja
  beforeEach(async () => {
    loja = await novaLoja()
    await loja.entrar()
  })
  afterEach(() => loja.fechar())

  it('cria categoria e em seguida cadastra produto nela; zerar estoque deixa ESGOTADO', async () => {
    const c = await loja.chamar('POST', 'categorias', { corpo: { nome: 'Blusas' } })
    expect(c.status).toBe(201)
    expect(c.corpo.categoria.slug).toBe('blusas')

    const p = await loja.chamar('POST', 'produtos', {
      corpo: { nome: 'Blusa Ciganinha', preco: '59,90', categoria: 'blusas', imagem: PNG_1PX,
        tamanhos: [{ tamanho: 'p', quantidade: 2 }, { tamanho: 'M', quantidade: 1 }] },
    })
    expect(p.status).toBe(201)
    expect(p.corpo.produto).toMatchObject({ codigo: 'GF-0001', preco: 59.9, tamanhos: [{ tamanho: 'P', quantidade: 2 }, { tamanho: 'M', quantidade: 1 }] })
    expect(p.corpo.produto.imagem).toMatch(/^\/produtos\/GF-0001-[a-f0-9]{6}\.png$/)

    const { carregar } = await import('../lib/dados.js')
    const vitrine = async () => catalogoPublico((await carregar(loja.arm, ['produtos', 'categorias', 'config'])).dados)
    expect((await vitrine()).produtos[0].situacao).toBe('disponivel')

    const ajuste = await loja.chamar('PATCH', 'estoque', {
      corpo: { ajustes: [{ codigo: 'GF-0001', tamanho: 'P', quantidade: 0 }, { codigo: 'GF-0001', tamanho: 'M', quantidade: 0 }] },
    })
    expect(ajuste.status).toBe(200)
    const depois = await vitrine()
    expect(depois.produtos[0].situacao).toBe('esgotado')
    expect(temQuantidade(depois)).toBe(false)
  })

  it('não remove categoria com produtos, a não ser movendo-os', async () => {
    await loja.chamar('POST', 'categorias', { corpo: { nome: 'Blusas' } })
    await loja.chamar('POST', 'categorias', { corpo: { nome: 'Vestidos' } })
    await loja.chamar('POST', 'produtos', { corpo: { nome: 'X', preco: 10, categoria: 'blusas', tamanhos: [{ tamanho: 'U', quantidade: 1 }] } })

    const recusa = await loja.chamar('DELETE', 'categorias', { query: { slug: 'blusas' } })
    expect(recusa.status).toBe(409)
    expect(recusa.corpo.produtosVinculados).toBe(1)

    const ok = await loja.chamar('DELETE', 'categorias', { query: { slug: 'blusas', moverPara: 'vestidos' } })
    expect(ok.status).toBe(200)
    const painel = await loja.chamar('GET', 'painel')
    expect(painel.corpo.produtos[0].categoria).toBe('vestidos')
    expect(painel.corpo.categorias.map((c) => c.slug)).toEqual(['vestidos'])
  })

  it('peça sem foto vira rascunho; só publica com foto; categoria é opcional', async () => {
    const r = await loja.chamar('POST', 'produtos', { corpo: { nome: 'Saia', cor: 'Azul', preco: 40, tamanhos: [{ tamanho: 'M', quantidade: 2 }] } })
    expect(r.status).toBe(201)
    expect(r.corpo.produto).toMatchObject({ categoria: null, cor: 'Azul', rascunho: true })

    const campos = { nome: 'Saia', cor: 'Azul', preco: 40, tamanhos: [{ tamanho: 'M', quantidade: 2 }] }
    const semFoto = await loja.chamar('PUT', 'produtos', { query: { codigo: 'GF-0001' }, corpo: { ...campos, publicar: true } })
    expect(semFoto.status).toBe(400)
    expect(semFoto.corpo.erro).toMatch(/Adicione uma foto/)

    const foto = await loja.chamar('PUT', 'produtos/imagem', { query: { codigo: 'GF-0001' }, corpo: { imagem: PNG_1PX } })
    expect(foto.status).toBe(200)
    expect(foto.corpo.produto.rascunho).toBe(true) // foto sozinha não publica

    const pub = await loja.chamar('PUT', 'produtos', { query: { codigo: 'GF-0001' }, corpo: { ...campos, publicar: true } })
    expect(pub.status).toBe(200)
    expect(pub.corpo.produto).toMatchObject({ rascunho: false, ativo: true })

    const tirarFoto = await loja.chamar('PUT', 'produtos', { query: { codigo: 'GF-0001' }, corpo: { ...campos, imagem: null } })
    expect(tirarFoto.status).toBe(400)
  })

  it('remover categoria pode deixar os produtos sem categoria', async () => {
    await loja.chamar('POST', 'categorias', { corpo: { nome: 'Blusas' } })
    await loja.chamar('POST', 'produtos', { corpo: { nome: 'X', preco: 10, categoria: 'blusas', tamanhos: [{ tamanho: 'U', quantidade: 1 }] } })
    const r = await loja.chamar('DELETE', 'categorias', { query: { slug: 'blusas', semCategoria: '1' } })
    expect(r.status).toBe(200)
    expect((await loja.chamar('GET', 'painel')).corpo.produtos[0].categoria).toBeNull()
  })

  it('valida entrada com mensagens em português', async () => {
    const r = await loja.chamar('POST', 'produtos', { corpo: { nome: '', preco: 10, categoria: 'x', tamanhos: [] } })
    expect(r.status).toBe(400)
    expect(r.corpo.erro).toBe('A categoria escolhida não existe mais. Escolha outra na lista.')
    await loja.chamar('POST', 'categorias', { corpo: { nome: 'Blusas' } })
    const semPreco = await loja.chamar('POST', 'produtos', { corpo: { nome: 'A', preco: 'abc', categoria: 'blusas', tamanhos: [{ tamanho: 'P', quantidade: 1 }] } })
    expect(semPreco.corpo.erro).toMatch(/preço válido/)
    const imagemFalsa = await loja.chamar('POST', 'produtos', {
      corpo: { nome: 'A', preco: 10, categoria: 'blusas', tamanhos: [{ tamanho: 'P', quantidade: 1 }], imagem: Buffer.from('<script>').toString('base64') },
    })
    expect(imagemFalsa.status).toBe(415)
  })
})
