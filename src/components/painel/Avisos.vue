<script setup>
import Icone from '../Icone.vue'
import { usePainel } from '../../stores/painel.js'
const store = usePainel()
</script>

<template>
  <div class="avisos" aria-live="polite">
    <TransitionGroup name="aviso">
      <div v-for="a in store.avisos.slice(-3)" :key="a.id" class="aviso" :class="a.tipo">
        <Icone :nome="a.tipo === 'erro' ? 'alerta' : 'check'" /> {{ a.texto }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.avisos { position: fixed; z-index: 100; left: 50%; transform: translateX(-50%); bottom: calc(84px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100vw - 32px)); pointer-events: none; }
@media (min-width: 900px) { .avisos { bottom: 24px; } }
.aviso { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: var(--texto); color: var(--branco); font-size: 14px; font-weight: 600; box-shadow: 0 10px 30px rgba(74,21,48,.3); }
.aviso.erro { background: var(--vermelho); }
.aviso-enter-active, .aviso-leave-active { transition: all .3s; }
.aviso-enter-from, .aviso-leave-to { opacity: 0; transform: translateY(10px); }
</style>
