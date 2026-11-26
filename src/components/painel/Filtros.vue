<script setup>
defineProps({ categorias: { type: Array, required: true }, comRascunho: { type: Boolean, default: false } })
const busca = defineModel('busca')
const categoria = defineModel('categoria')
const situacao = defineModel('situacao')
</script>

<template>
  <div class="p-filtros">
    <label class="p-campo"><span class="sr-only">Buscar</span>
      <input id="filtro-busca" v-model="busca" class="p-input" type="search" placeholder="Buscar por nome ou código" />
    </label>
    <label class="p-campo"><span class="sr-only">Categoria</span>
      <select id="filtro-categoria" v-model="categoria" class="p-input">
        <option value="">Todas as categorias</option>
        <option v-for="c in categorias" :key="c.slug" :value="c.slug">{{ c.nome }}</option>
        <option value="__sem__">Sem categoria</option>
      </select>
    </label>
    <label class="p-campo"><span class="sr-only">Situação</span>
      <select id="filtro-situacao" v-model="situacao" class="p-input">
        <option value="">Todas as situações</option>
        <option value="disponivel">Disponível</option>
        <option value="baixo">Estoque baixo</option>
        <option value="esgotado">Esgotado</option>
        <option value="oculto">Oculto da vitrine</option>
        <option v-if="comRascunho" value="rascunho">Novas (fora da loja)</option>
      </select>
    </label>
  </div>
</template>
