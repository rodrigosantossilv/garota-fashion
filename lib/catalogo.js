import { situacao } from './situacao.js'

/** A cliente só vê peças publicadas (não rascunho), visíveis e com foto. */
export const visivelNaLoja = (p) => p.ativo !== false && !p.rascunho && Boolean(p.imagem)

/**
 * Monta o catálogo PÚBLICO. Nenhuma quantidade sai daqui:
 * cada tamanho vira apenas { tamanho, disponivel }.
 */
export function catalogoPublico({ produtos = [], categorias = [], config = {} }) {
  const ativos = produtos
    .filter(visivelNaLoja)
    .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')))

  const usadas = new Set(ativos.map((p) => p.categoria))

  return {
    loja: { whatsapp: config.whatsapp || '', instagram: config.instagram || '' },
    categorias: [...categorias]
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .filter((c) => usadas.has(c.slug))
      .map((c) => ({ slug: c.slug, nome: c.nome })),
    produtos: ativos.map((p) => ({
      codigo: p.codigo,
      nome: p.nome,
      cor: p.cor || '',
      preco: p.preco,
      categoria: p.categoria || null,
      imagem: p.imagem || null,
      situacao: situacao(p),
      tamanhos: (p.tamanhos || []).map((t) => ({ tamanho: t.tamanho, disponivel: Number(t.quantidade) > 0 })),
    })),
  }
}
