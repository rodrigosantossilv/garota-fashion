<script setup>
import { computed, ref } from 'vue'
import Icone from '../../components/Icone.vue'
import { api } from '../../lib/api.js'
import { arquivoParaBase64 } from '../../lib/imagem.js'
import { formatarData, formatarPreco } from '../../lib/formato.js'
import { usePainel } from '../../stores/painel.js'
import { useRouter } from 'vue-router'

const store = usePainel()
const router = useRouter()
const exportando = ref(false)
const analisando = ref(false)
const confirmando = ref(false)
const erro = ref('')
const arquivo = ref(null) // { nome, base64 }
const previa = ref(null)
const abertos = ref({})

const mudouPreco = (a) => a.precoAntes !== a.precoDepois
const mudouQtd = (a) => a.quantidadeAntes !== a.quantidadeDepois
const resumo = computed(() => previa.value && [
  ['Linhas lidas', previa.value.linhasLidas],
  ['Peças novas', previa.value.novos.length],
  ['Serão alteradas', previa.value.alteracoes.length],
  ['Sem alteração', previa.value.semAlteracao],
  ['Ignoradas', previa.value.ignoradas.length],
])

async function baixar(rota, nome) {
  exportando.value = true
  try {
    await store.salvarAjustesAgora().catch(() => {})
    const blob = await api('GET', rota, { binario: true })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: nome })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) {
    store.avisar(e.message, 'erro')
  } finally {
    exportando.value = false
  }
}

async function escolher(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  erro.value = ''
  previa.value = null
  if (!/\.xlsx$/i.test(f.name)) return (erro.value = 'Envie um arquivo do Excel no formato .xlsx.')
  if (f.size > 2 * 1024 * 1024) return (erro.value = 'A planilha é grande demais (máximo de 2 MB).')
  analisando.value = true
  try {
    await store.salvarAjustesAgora().catch(() => {})
    arquivo.value = { nome: f.name, base64: await arquivoParaBase64(f) }
    previa.value = (await api('POST', 'planilha/importar', { corpo: { arquivo: arquivo.value.base64, nomeArquivo: f.name } })).previa
  } catch (err) {
    erro.value = err.message
  } finally {
    analisando.value = false
  }
}

async function confirmar() {
  confirmando.value = true
  try {
    const { resultado } = await api('POST', 'planilha/importar', {
      corpo: { arquivo: arquivo.value.base64, nomeArquivo: arquivo.value.nome, confirmar: true },
    })
    await store.carregar(true)
    const partes = []
    if (resultado.criados.length) partes.push(`${resultado.criados.length} peça(s) nova(s) em Novas peças`)
    if (resultado.alteracoes.length) partes.push(`${resultado.alteracoes.length} linha(s) atualizada(s)`)
    if (resultado.ignoradas.length) partes.push(`${resultado.ignoradas.length} ignorada(s)`)
    store.avisar(`Importado: ${partes.join(', ')}.`)
    cancelar()
    if (resultado.criados.length) router.push({ name: 'novas' })
  } catch (e) {
    erro.value = e.message
  } finally {
    confirmando.value = false
  }
}

function cancelar() {
  previa.value = null
  arquivo.value = null
}
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo"><div><h1>Planilha do Excel</h1><p>Exporte o estoque, ajuste preços e quantidades no Excel e importe de volta.</p></div></div>

    <div class="duas">
      <section class="p-cartao bloco">
        <h2><Icone nome="baixar" /> Baixar</h2>
        <p><strong>Modelo em branco:</strong> para cadastrar peças novas (Nome, Cor, Tamanho, Preço e Quantidade).</p>
        <button type="button" class="btn btn-claro" :disabled="exportando" @click="baixar('planilha/modelo', 'garota-fashion-modelo.xlsx')">Baixar modelo em branco</button>
        <p><strong>Estoque atual:</strong> todas as peças com código, para atualizar preço e quantidade.</p>
        <button type="button" class="btn" :disabled="exportando || !store.produtos.length"
          @click="baixar('planilha/exportar', `garota-fashion-estoque-${new Date().toISOString().slice(0, 10)}.xlsx`)">
          {{ exportando ? 'Gerando…' : 'Baixar estoque atual' }}
        </button>
      </section>

      <section class="p-cartao bloco">
        <h2><Icone nome="subir" /> Importar</h2>
        <p><strong>Sem código:</strong> vira peça nova (linhas com o mesmo Nome e Cor viram uma peça com vários tamanhos). Ela entra em <strong>Novas peças</strong>, fora da loja, até você adicionar a foto e a categoria.</p>
        <p><strong>Com código:</strong> atualiza preço e quantidade daquela peça.</p>
        <label class="btn btn-claro" :class="{ desativado: analisando }">
          <input id="planilha-arquivo" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="sr-only" :disabled="analisando" @change="escolher" />
          {{ analisando ? 'Lendo planilha…' : 'Escolher arquivo .xlsx' }}
        </label>
      </section>
    </div>

    <p v-if="erro" class="p-erro" role="alert">{{ erro }}</p>

    <section v-if="previa" class="p-cartao previa" aria-labelledby="t-previa">
      <h2 id="t-previa">Pré-visualização: {{ arquivo.nome }}</h2>
      <p class="aviso">Nada foi salvo ainda. Confira e clique em <strong>Confirmar importação</strong>.</p>
      <dl class="resumo">
        <div v-for="[r, v] in resumo" :key="r"><dt>{{ r }}</dt><dd class="num">{{ v }}</dd></div>
      </dl>

      <template v-if="previa.novos.length">
        <h3>Peças novas <small>(entram fora da loja, em Novas peças)</small></h3>
        <div class="p-tabela-wrap">
          <table class="p-tabela">
            <thead><tr><th>Linhas</th><th>Nome</th><th>Cor</th><th>Tamanhos</th><th>Preço</th></tr></thead>
            <tbody>
              <tr v-for="n in previa.novos" :key="n.linhas[0]">
                <td class="num">{{ n.linhas.join(', ') }}</td>
                <td><strong>{{ n.nome }}</strong></td>
                <td>{{ n.cor || '—' }}</td>
                <td class="num">{{ n.tamanhos.map((t) => `${t.tamanho}: ${t.quantidade}`).join(' · ') }}</td>
                <td class="num">{{ formatarPreco(n.preco) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="previa.alteracoes.length">
        <h3>Alterações em peças existentes</h3>
        <div class="p-tabela-wrap">
          <table class="p-tabela">
            <thead><tr><th>Linha</th><th>Produto</th><th>Tam.</th><th>Preço</th><th>Quantidade</th></tr></thead>
            <tbody>
              <tr v-for="a in previa.alteracoes" :key="a.linha">
                <td class="num">{{ a.linha }}</td>
                <td><strong>{{ a.codigo }}</strong> {{ a.nome }}</td>
                <td>{{ a.tamanho }}</td>
                <td class="num" :class="{ muda: mudouPreco(a) }">{{ mudouPreco(a) ? `${formatarPreco(a.precoAntes)} → ${formatarPreco(a.precoDepois)}` : formatarPreco(a.precoDepois) }}</td>
                <td class="num" :class="{ muda: mudouQtd(a) }">{{ mudouQtd(a) ? `${a.quantidadeAntes} → ${a.quantidadeDepois}` : a.quantidadeDepois }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-if="previa.ignoradas.length">
        <h3 class="t-ignoradas"><Icone nome="alerta" /> Linhas ignoradas</h3>
        <div class="p-tabela-wrap">
          <table class="p-tabela">
            <thead><tr><th>Linha</th><th>Peça</th><th>Tam.</th><th>Motivo</th></tr></thead>
            <tbody>
              <tr v-for="i in previa.ignoradas" :key="i.linha"><td class="num">{{ i.linha }}</td><td>{{ i.codigo !== '—' ? i.codigo : i.nome || '—' }}</td><td>{{ i.tamanho }}</td><td>{{ i.motivo }}</td></tr>
            </tbody>
          </table>
        </div>
      </template>

      <div class="acoes">
        <button type="button" class="btn btn-claro" @click="cancelar">Cancelar</button>
        <button type="button" class="btn" :disabled="confirmando || !(previa.alteracoes.length || previa.novos.length)" @click="confirmar">
          {{ confirmando ? 'Importando…' : previa.alteracoes.length || previa.novos.length ? 'Confirmar importação' : 'Nada para importar' }}
        </button>
      </div>
    </section>

    <section v-if="store.importacoes.length" class="p-cartao">
      <h2>Últimas importações</h2>
      <ul class="historico">
        <li v-for="(imp, n) in store.importacoes" :key="imp.data">
          <div class="linha-hist">
            <span><strong>{{ formatarData(imp.data) }}</strong> · {{ imp.arquivo }} · <template v-if="imp.criadas">{{ imp.criadas }} nova(s), </template>{{ imp.alteradas }} alterada(s), {{ imp.ignoradas.length }} ignorada(s)</span>
            <button v-if="imp.ignoradas.length" type="button" class="btn btn-claro btn-pequeno" @click="abertos[n] = !abertos[n]">
              {{ abertos[n] ? 'Ocultar' : 'Ver ignoradas' }}
            </button>
          </div>
          <ul v-if="abertos[n]" class="ignoradas">
            <li v-for="i in imp.ignoradas" :key="i.linha">Linha {{ i.linha }} ({{ i.codigo }} {{ i.tamanho }}): {{ i.motivo }}</li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.duas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 760px) { .duas { grid-template-columns: minmax(0, 1fr); } }
.bloco { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.bloco h2 { display: flex; align-items: center; gap: 8px; margin: 0; }
.bloco p { margin: 0; font-size: 14px; line-height: 1.55; color: var(--texto-suave); }
.bloco label { cursor: pointer; }
.desativado { opacity: .6; pointer-events: none; }
.dica { color: var(--texto-suave); font-size: 12px; }
.previa { display: flex; flex-direction: column; gap: 12px; border-color: var(--rosa); }
.previa h2, .previa h3 { margin: 0; }
.previa h3 { font-size: 14px; margin-top: 6px; }
.previa h3 small { font-weight: 500; color: var(--texto-suave); }
.t-ignoradas { display: flex; align-items: center; gap: 6px; color: var(--amarelo); }
.aviso { margin: 0; font-size: 14px; background: #fff8ec; padding: 10px 12px; border-radius: 10px; }
.resumo { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 0; }
@media (max-width: 560px) { .resumo { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.resumo div { background: #fdf6fa; border-radius: 10px; padding: 10px 12px; }
.resumo dt { font-size: 12px; color: var(--texto-suave); font-weight: 600; }
.resumo dd { margin: 2px 0 0; font-size: 22px; font-weight: 700; }
.muda { color: var(--rosa); font-weight: 700; }
.acoes { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.historico { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
.linha-hist { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.ignoradas { margin: 8px 0 0; padding-left: 18px; color: var(--texto-suave); font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
</style>
