<script setup>
// Controle − [n] + para ajustar a quantidade de um tamanho.
import Icone from '../Icone.vue'
const props = defineProps({ valor: { type: Number, required: true }, rotulo: { type: String, required: true } })
const emit = defineEmits(['mudar'])
const definir = (v) => emit('mudar', Math.max(0, Math.min(99999, Math.round(Number(v) || 0))))
</script>

<template>
  <div class="qtd" :class="{ zero: props.valor === 0 }">
    <span class="rotulo">{{ rotulo }}</span>
    <button type="button" :aria-label="`Diminuir ${rotulo}`" :disabled="valor === 0" @click="definir(valor - 1)"><Icone nome="menos" /></button>
    <input type="number" inputmode="numeric" min="0" max="99999" :value="valor" :aria-label="`Quantidade do tamanho ${rotulo}`"
      class="num" @change="definir($event.target.value)" @focus="$event.target.select()" />
    <button type="button" :aria-label="`Aumentar ${rotulo}`" @click="definir(valor + 1)"><Icone nome="mais" /></button>
  </div>
</template>

<style scoped>
.qtd { display: inline-flex; align-items: center; border: 1.5px solid var(--borda); border-radius: 10px; overflow: hidden; background: var(--branco); height: 36px; }
.qtd.zero { border-color: #f3c4c4; background: #fff7f7; }
.rotulo { padding: 0 8px; font-size: 12px; font-weight: 700; color: var(--texto-suave); border-right: 1px solid var(--borda); align-self: stretch; display: grid; place-items: center; min-width: 34px; }
button { width: 32px; height: 100%; border: 0; background: none; color: var(--rosa); cursor: pointer; display: grid; place-items: center; }
button:hover:not(:disabled) { background: var(--rosa-claro); }
button:disabled { color: #d9c2cd; cursor: default; }
input { width: 46px; height: 100%; border: 0; text-align: center; font-weight: 700; font-size: 15px; background: none; -moz-appearance: textfield; }
input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input:focus { outline: none; background: var(--rosa-claro); }
</style>
