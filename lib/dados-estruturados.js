import { catalogoPublico } from './catalogo.js'

/**
 * "Crachá escondido" para o Google (JSON-LD, schema.org).
 * Quem visita não vê; o Google usa para entender que é uma loja de roupas
 * em Feira de Santana - BA e quais peças estão disponíveis. Sem quantidades.
 */
export function dadosEstruturados(dados, { url } = {}) {
  const cat = catalogoPublico(dados)
  const w = cat.loja.whatsapp
  const loja = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'Garota Fashion',
    description: 'Moda feminina em Feira de Santana. Invista no melhor look, para você.',
    address: { '@type': 'PostalAddress', addressLocality: 'Feira de Santana', addressRegion: 'BA', addressCountry: 'BR' },
    ...(url ? { url } : {}),
    ...(w ? { telephone: `+${w.slice(0, 2)} ${w.slice(2, 4)} ${w.slice(4, -4)}-${w.slice(-4)}` } : {}),
    ...(cat.loja.instagram ? { sameAs: [`https://www.instagram.com/${cat.loja.instagram}`] } : {}),
  }
  const blocos = [loja]
  if (cat.produtos.length) {
    blocos.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Catálogo Garota Fashion',
      itemListElement: cat.produtos.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.cor ? `${p.nome} - ${p.cor}` : p.nome,
          sku: p.codigo,
          ...(p.cor ? { color: p.cor } : {}),
          ...(p.imagem ? { image: url ? new URL(p.imagem, url).href : p.imagem } : {}),
          offers: {
            '@type': 'Offer',
            price: p.preco.toFixed(2),
            priceCurrency: 'BRL',
            availability: p.situacao === 'esgotado' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          },
        },
      })),
    })
  }
  return blocos
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`)
    .join('\n    ')
}
