<script setup>
import Icone from '../../components/Icone.vue'
import Filtros from '../../components/painel/Filtros.vue'
import { ROTULO_SITUACAO, useFiltroProdutos } from '../../components/painel/FiltroProdutos.js'
import { usePainel } from '../../stores/painel.js'
import { useDialogo } from '../../stores/dialogo.js'
import { formatarPreco, imagemPainel } from '../../lib/formato.js'

const store = usePainel()
const dialogo = useDialogo()
const { busca, categoria, situacao, filtrados } = useFiltroProdutos(store)

async function remover(p) {
  const ok = await dialogo.confirmar({
    titulo: 'Excluir peça?',
    mensagem: `"${p.nome}" (${p.codigo}) será excluída da loja e do painel. Esta ação não pode ser desfeita.`,
    ok: 'Excluir',
    cancelar: 'Cancelar',
    tom: 'perigo',
  })
  if (!ok) return
  try {
    await store.removerProduto(p.codigo)
    store.avisar(`"${p.nome}" excluído. ${store.armazenamento === 'github' ? 'A vitrine atualiza em cerca de 1 minuto.' : ''}`)
  } catch (e) {
    store.avisar(e.message, 'erro')
  }
}
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo">
      <div><h1>Produtos</h1><p>{{ store.produtos.length }} cadastrado(s)</p></div>
      <RouterLink :to="{ name: 'produto-novo' }" class="btn"><Icone nome="mais" /> Novo produto</RouterLink>
    </div>

    <Filtros v-model:busca="busca" v-model:categoria="categoria" v-model:situacao="situacao" :categorias="store.categorias" com-rascunho />

    <div v-if="store.produtos.length === 0" class="p-cartao p-vazio">
      <strong>Nenhum produto ainda</strong>
      Clique em “Novo produto” para cadastrar a primeira peça.
    </div>
    <p v-else-if="filtrados.length === 0" class="p-cartao p-vazio">Nenhum produto encontrado com esses filtros.</p>

    <div v-else class="grade">
      <article v-for="p in filtrados" :key="p.codigo" class="card p-cartao">
        <img v-if="p.imagem" :src="imagemPainel(p.imagem)" alt="" class="foto" />
        <div v-else class="foto sem"><Icone nome="camera" /></div>
        <div class="info">
          <small class="codigo">{{ p.codigo }} · {{ store.nomeCategoria(p.categoria) }}</small>
          <strong>{{ p.nome }}<template v-if="p.cor"> · {{ p.cor }}</template></strong>
          <span class="preco">{{ formatarPreco(p.preco) }}</span>
          <span class="pills">
            <span v-if="p.rascunho" class="pill pill-novo">Nova · fora da loja</span>
            <span class="pill" :class="`pill-${store.situacaoDe(p)}`">{{ ROTULO_SITUACAO[store.situacaoDe(p)] }}</span>
            <span v-if="!p.rascunho && p.ativo === false" class="pill pill-oculto">Oculto</span>
          </span>
          <span class="tams">{{ p.tamanhos.map((t) => `${t.tamanho}: ${t.quantidade}`).join(' · ') }}</span>
        </div>
        <div class="acoes">
          <RouterLink :to="{ name: 'produto-editar', params: { codigo: p.codigo } }" class="btn btn-claro btn-pequeno"><Icone nome="lapis" /> Editar</RouterLink>
          <button type="button" class="btn btn-perigo btn-pequeno" @click="remover(p)"><Icone nome="lixo" /> Excluir</button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.card { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.foto { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 10px; background: var(--rosa-claro); max-width: 100%; }
.foto.sem { display: grid; place-items: center; color: var(--rosa); }
.foto.sem .icone { width: 30px; height: 30px; }
.info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.codigo { color: var(--texto-suave); font-size: 12px; }
.preco { color: var(--rosa); font-weight: 700; }
.pills { display: flex; gap: 6px; flex-wrap: wrap; }
.tams { font-size: 12px; color: var(--texto-suave); font-variant-numeric: tabular-nums; }
.acoes { display: flex; gap: 8px; margin-top: auto; }
.acoes > * { flex: 1; }
</style>
