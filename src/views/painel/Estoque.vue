<script setup>
import { computed } from 'vue'
import Icone from '../../components/Icone.vue'
import Filtros from '../../components/painel/Filtros.vue'
import Quantidade from '../../components/painel/Quantidade.vue'
import ListaNovasPecas from '../../components/painel/ListaNovasPecas.vue'
import { ROTULO_SITUACAO, useFiltroProdutos } from '../../components/painel/FiltroProdutos.js'
import { usePainel } from '../../stores/painel.js'
import { resumoEstoque, quantidadeTotal } from '../../../lib/situacao.js'
import { formatarPreco, imagemPainel } from '../../lib/formato.js'

const store = usePainel()
const { busca, categoria, situacao, filtrados } = useFiltroProdutos(store, () => store.pecasPublicadas)
const resumo = computed(() => resumoEstoque(store.produtos, store.config.limiteEstoqueBaixo))
const filtrarPor = (s) => (situacao.value = situacao.value === s ? '' : s)
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo">
      <div>
        <h1>Estoque</h1>
        <p>Olá, {{ store.usuario?.nome }}! Ajuste as quantidades com − e +. Tudo é salvo sozinho.</p>
      </div>
      <span class="status-salvar" aria-live="polite">
        <template v-if="store.salvandoAjustes">Salvando…</template>
        <template v-else-if="store.temAjustesPendentes">Alterações a salvar…
          <button class="btn btn-pequeno" @click="store.salvarAjustesAgora().catch(() => {})">Salvar agora</button>
        </template>
      </span>
    </div>

    <section class="resumo" aria-label="Resumo do estoque">
      <button type="button" class="tile" :class="{ ativo: situacao === '' }" @click="situacao = ''">
        <span class="valor num">{{ resumo.totalProdutos }}</span><span class="rotulo">Produtos <small>(todos)</small></span>
      </button>
      <button type="button" class="tile t-esgotado" :class="{ ativo: situacao === 'esgotado' }" @click="filtrarPor('esgotado')">
        <span class="valor num">{{ resumo.esgotados }}</span><span class="rotulo">Esgotados</span>
      </button>
      <button type="button" class="tile t-baixo" :class="{ ativo: situacao === 'baixo' }" @click="filtrarPor('baixo')">
        <span class="valor num">{{ resumo.estoqueBaixo }}</span><span class="rotulo">Estoque baixo <small>(até {{ store.config.limiteEstoqueBaixo }} un.)</small></span>
      </button>
      <div class="tile t-valor">
        <span class="valor num">{{ formatarPreco(resumo.valorEmEstoque) }}</span><span class="rotulo">Valor em estoque</span>
      </div>
    </section>

    <section v-if="store.novasPecas.length" class="p-cartao novas" aria-labelledby="t-novas">
      <div class="novas-topo">
        <h2 id="t-novas">Novas peças fora da loja ({{ store.novasPecas.length }})</h2>
        <RouterLink :to="{ name: 'novas' }" class="ver-todas">Ver todas →</RouterLink>
      </div>
      <p class="dica-novas">Adicione a foto para liberar o botão “Adicionar à loja”.</p>
      <ListaNovasPecas :pecas="store.novasPecas.slice(0, 3)" />
    </section>

    <Filtros v-model:busca="busca" v-model:categoria="categoria" v-model:situacao="situacao" :categorias="store.categorias" />

    <div v-if="store.produtos.length === 0" class="p-cartao p-vazio">
      <strong>Nenhum produto cadastrado ainda</strong>
      Comece criando as categorias e depois cadastre as peças.
      <div class="acoes-vazio">
        <RouterLink :to="{ name: 'categorias' }" class="btn btn-claro">Criar categorias</RouterLink>
        <RouterLink :to="{ name: 'produto-novo' }" class="btn"><Icone nome="mais" /> Cadastrar produto</RouterLink>
      </div>
    </div>
    <p v-else-if="filtrados.length === 0" class="p-cartao p-vazio">Nenhum produto encontrado com esses filtros.</p>

    <ul v-else class="lista">
      <li v-for="p in filtrados" :key="p.codigo" class="item p-cartao">
        <RouterLink :to="{ name: 'produto-editar', params: { codigo: p.codigo } }" class="cabeca">
          <img v-if="p.imagem" :src="imagemPainel(p.imagem)" alt="" class="miniatura" />
          <span v-else class="miniatura"><Icone nome="camera" /></span>
          <span class="dados">
            <strong>{{ p.nome }}<template v-if="p.cor"> · {{ p.cor }}</template></strong>
            <small>{{ p.codigo }} · {{ store.nomeCategoria(p.categoria) }} · {{ formatarPreco(p.preco) }}</small>
            <span class="pills">
              <span class="pill" :class="`pill-${store.situacaoDe(p)}`">{{ ROTULO_SITUACAO[store.situacaoDe(p)] }}</span>
              <span v-if="p.ativo === false" class="pill pill-oculto">Oculto</span>
              <span class="total num">{{ quantidadeTotal(p) }} un.</span>
            </span>
          </span>
        </RouterLink>
        <div class="tamanhos">
          <Quantidade v-for="t in p.tamanhos" :key="t.tamanho" :rotulo="t.tamanho" :valor="t.quantidade"
            @mudar="(q) => store.ajustarQuantidade(p.codigo, t.tamanho, q)" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.novas { border: 2px solid var(--rosa); background: #fff7fb; display: flex; flex-direction: column; gap: 10px; }
.novas-topo { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.novas h2 { margin: 0; font-size: 16px; color: var(--rosa); }
.ver-todas { font-size: 13px; font-weight: 700; color: var(--rosa); }
.dica-novas { margin: 0; font-size: 13px; color: var(--texto-suave); }
.status-salvar { font-size: 13px; color: var(--texto-suave); display: inline-flex; align-items: center; gap: 8px; min-height: 32px; }
.resumo { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 760px) { .resumo { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.tile {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left;
  background: var(--branco); border: 1.5px solid var(--borda); border-radius: var(--raio); padding: 14px 16px; cursor: pointer; min-width: 0;
}
div.tile { cursor: default; }
button.tile:hover { border-color: var(--rosa); }
.tile.ativo { border-color: var(--rosa); box-shadow: 0 0 0 3px rgba(201,36,95,.12); }
.valor { font-size: 26px; font-weight: 700; color: var(--texto); overflow-wrap: anywhere; }
.t-valor .valor { font-size: 21px; color: var(--rosa); }
.t-esgotado .valor { color: var(--vermelho); }
.t-baixo .valor { color: var(--amarelo); }
.rotulo { font-size: 13px; font-weight: 600; color: var(--texto-suave); }
.rotulo small { font-weight: 500; }

.acoes-vazio { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 16px; }
.lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; }
.cabeca { display: flex; align-items: center; gap: 12px; text-decoration: none; min-width: 0; flex: 1 1 260px; }
.dados { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dados strong { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dados small { color: var(--texto-suave); font-size: 12px; }
.pills { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 2px; }
.total { font-size: 12px; font-weight: 700; color: var(--texto-suave); }
.tamanhos { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
