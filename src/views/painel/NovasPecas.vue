<script setup>
import { computed } from 'vue'
import Icone from '../../components/Icone.vue'
import ListaNovasPecas from '../../components/painel/ListaNovasPecas.vue'
import { usePainel } from '../../stores/painel.js'

const store = usePainel()
const comFoto = computed(() => store.novasPecas.filter((p) => p.imagem).length)
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo">
      <div>
        <h1>Novas peças</h1>
        <p>Peças que ainda não estão na loja. Adicione a foto e depois clique em “Adicionar à loja”.</p>
      </div>
      <RouterLink :to="{ name: 'planilha' }" class="btn btn-claro"><Icone nome="planilha" /> Importar planilha</RouterLink>
    </div>

    <ol class="passos">
      <li><strong>1.</strong> Importe a planilha com nome, cor, tamanho, preço e quantidade</li>
      <li><strong>2.</strong> Adicione a foto de cada peça</li>
      <li><strong>3.</strong> Clique em “Adicionar à loja”, escolha a categoria e publique</li>
    </ol>

    <div v-if="!store.novasPecas.length" class="p-cartao p-vazio">
      <strong>Nenhuma peça esperando</strong>
      Todas as peças cadastradas já estão na loja.
    </div>
    <template v-else>
      <p class="contagem">{{ store.novasPecas.length }} peça(s) · {{ comFoto }} com foto, pronta(s) para adicionar à loja</p>
      <ListaNovasPecas :pecas="store.novasPecas" />
    </template>
  </div>
</template>

<style scoped>
.passos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 760px) { .passos { grid-template-columns: minmax(0, 1fr); } }
.passos li { background: var(--branco); border: 1px solid var(--borda); border-radius: 12px; padding: 12px 14px; font-size: 14px; line-height: 1.45; }
.passos strong { color: var(--rosa); font-size: 16px; }
.contagem { margin: 0; font-size: 14px; color: var(--texto-suave); font-weight: 600; }
</style>
