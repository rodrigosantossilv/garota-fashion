import { computed, ref } from 'vue'

/** Filtros compartilhados por Estoque e Produtos: busca, categoria e situação. */
export function useFiltroProdutos(store, fonte = () => store.produtos) {
  const busca = ref('')
  const categoria = ref('')
  const situacao = ref('')
  const normalizar = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

  const filtrados = computed(() => {
    const termo = normalizar(busca.value.trim())
    return fonte()
      .filter((p) => !termo || normalizar(`${p.nome} ${p.cor || ''} ${p.codigo}`).includes(termo))
      .filter((p) => !categoria.value || (categoria.value === '__sem__' ? !p.categoria : p.categoria === categoria.value))
      .filter((p) => {
        if (!situacao.value) return true
        if (situacao.value === 'rascunho') return p.rascunho
        if (situacao.value === 'oculto') return !p.rascunho && p.ativo === false
        return store.situacaoDe(p) === situacao.value
      })
      .sort((a, b) => b.codigo.localeCompare(a.codigo))
  })
  return { busca, categoria, situacao, filtrados }
}

export const ROTULO_SITUACAO = { disponivel: 'Disponível', baixo: 'Estoque baixo', esgotado: 'Esgotado' }
