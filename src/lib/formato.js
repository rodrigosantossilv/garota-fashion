const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatarPreco = (v) => moeda.format(Number(v) || 0)

/** 5575999990000 -> (75) 99999-0000 */
export function formatarTelefone(digitos = '') {
  const d = String(digitos).replace(/\D/g, '').replace(/^55/, '')
  if (d.length < 10) return d
  return `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`
}

export function linkWhatsapp(numero, mensagem) {
  const n = String(numero || '').replace(/\D/g, '')
  return `https://wa.me/${n}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

/** Imagem no painel: lida pela API (aparece antes mesmo da vitrine ser republicada). */
export const imagemPainel = (url) => (url ? `/api/arquivo?nome=${encodeURIComponent(url.split('/').pop())}` : null)

export const formatarData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''
