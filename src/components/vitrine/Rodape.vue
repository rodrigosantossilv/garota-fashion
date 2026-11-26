<script setup>
import Icone from '../Icone.vue'
import { formatarTelefone, linkWhatsapp } from '../../lib/formato.js'
import { LOJA } from '../../config/loja.js'

defineProps({ loja: { type: Object, required: true } })
</script>

<template>
  <footer class="rodape">
    <div class="interno">
      <div class="marca-bloco">
        <span class="marca">Garota</span>
        <span class="marca-sub">FASHION</span>
        <p>{{ LOJA.frase }}</p>
      </div>
      <ul class="contatos">
        <li v-if="loja.instagram">
          <a :href="`https://www.instagram.com/${loja.instagram}`" target="_blank" rel="noopener"><Icone nome="instagram" /> @{{ loja.instagram }}</a>
        </li>
        <li v-if="loja.whatsapp">
          <a :href="linkWhatsapp(loja.whatsapp, 'Olá! Vim pelo site da Garota Fashion.')" target="_blank" rel="noopener"><Icone nome="whatsapp" /> {{ formatarTelefone(loja.whatsapp) }}</a>
        </li>
        <li><Icone nome="local" /> {{ LOJA.cidade }}</li>
      </ul>
    </div>
    <p class="copy">© {{ new Date().getFullYear() }} Garota Fashion · Moda feminina</p>
  </footer>
</template>

<style scoped>
.rodape { background: var(--rosa-escuro); color: var(--branco); padding: 36px var(--gutter-d) calc(20px + env(safe-area-inset-bottom, 0px)) var(--gutter-e); margin-top: 48px; }
.interno { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 28px; }
.marca-bloco { display: flex; flex-direction: column; align-items: flex-start; }
.marca, .marca-sub { color: var(--branco); }
.marca { font-size: 40px; }
.marca-sub { font-size: 11px; margin-top: 4px; }
.marca-bloco p { margin: 14px 0 0; font-size: 14px; opacity: .9; }
.contatos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; font-weight: 600; font-size: 15px; }
.contatos li, .contatos a { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.contatos a:hover { text-decoration: underline; }
.copy { max-width: 1200px; margin: 28px auto 0; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.25); font-size: 12px; opacity: .8; }
</style>
