/** Regras de estoque. A quantidade é interna; a vitrine só recebe a situação. */

export const quantidadeTotal = (produto) =>
  (produto.tamanhos || []).reduce((soma, t) => soma + (Number(t.quantidade) || 0), 0)

/** "esgotado" quando todos os tamanhos estão zerados; senão "disponivel". */
export const situacao = (produto) => (quantidadeTotal(produto) > 0 ? 'disponivel' : 'esgotado')

export const estoqueBaixo = (produto, limite) => {
  const total = quantidadeTotal(produto)
  return total > 0 && total <= limite
}

/** Situação usada nos filtros do painel. */
export const situacaoPainel = (produto, limite) =>
  situacao(produto) === 'esgotado' ? 'esgotado' : estoqueBaixo(produto, limite) ? 'baixo' : 'disponivel'

export const valorEmEstoque = (produtos) =>
  Math.round(produtos.reduce((soma, p) => soma + p.preco * quantidadeTotal(p), 0) * 100) / 100

export function resumoEstoque(produtos, limite) {
  return {
    totalProdutos: produtos.length,
    esgotados: produtos.filter((p) => situacao(p) === 'esgotado').length,
    estoqueBaixo: produtos.filter((p) => estoqueBaixo(p, limite)).length,
    valorEmEstoque: valorEmEstoque(produtos),
  }
}
