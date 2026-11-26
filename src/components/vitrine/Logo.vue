<script setup>
defineProps({ tamanho: { type: Number, default: 34 } })
</script>

<template>
  <span class="logo" :style="{ '--t': tamanho + 'px' }" aria-label="Garota Fashion">
    <span class="marca">Garota</span>
    <span class="marca-sub">FASHION</span>
  </span>
</template>

<style scoped>
.logo { display: inline-flex; flex-direction: column; align-items: center; line-height: 1; }
.marca { font-size: var(--t); }
.marca-sub { font-size: calc(var(--t) * .26); margin-top: calc(var(--t) * .08); margin-left: .5em; }
</style>
