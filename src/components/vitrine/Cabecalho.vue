<script setup>
import Icone from '../Icone.vue'
import Logo from './Logo.vue'
import { linkWhatsapp } from '../../lib/formato.js'
import { LOJA } from '../../config/loja.js'

defineProps({ loja: { type: Object, required: true } })
</script>

<template>
  <div class="barra-topo">
    <span><Icone nome="local" /> {{ LOJA.cidade }}</span>
    <span class="so-desktop">Atendimento e compras pelo WhatsApp</span>
  </div>
  <header class="cabecalho">
    <div class="interno">
      <RouterLink to="/" class="logo-link" aria-label="Página inicial"><Logo :tamanho="32" /></RouterLink>
      <nav class="menu" aria-label="Principal">
        <RouterLink to="/catalogo" class="item" :class="{ ativo: $route.name === 'catalogo' }">Catálogo</RouterLink>
        <a v-if="loja.whatsapp" :href="linkWhatsapp(loja.whatsapp, 'Olá! Vim pelo site da Garota Fashion.')" target="_blank" rel="noopener" class="item so-desktop">Atendimento</a>
      </nav>
      <div class="acoes">
        <a v-if="loja.instagram" :href="`https://www.instagram.com/${loja.instagram}`" target="_blank" rel="noopener" class="icone-link" aria-label="Instagram"><Icone nome="instagram" /></a>
        <a v-if="loja.whatsapp" :href="linkWhatsapp(loja.whatsapp, 'Olá! Vim pelo site da Garota Fashion.')" target="_blank" rel="noopener" class="icone-link" aria-label="WhatsApp"><Icone nome="whatsapp" /></a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.barra-topo {
  background: var(--rosa); color: var(--branco); font-size: 12px; font-weight: 600; letter-spacing: .04em;
  display: flex; justify-content: space-between; gap: 12px;
  padding: 7px var(--gutter-d) 7px var(--gutter-e);
}
.barra-topo span { display: inline-flex; align-items: center; gap: 6px; }
.cabecalho {
  position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
  background: rgba(255, 244, 254, .92); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--borda);
}
.interno {
  max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 10px var(--gutter-d) 10px var(--gutter-e);
}
.logo-link { text-decoration: none; }
.menu { display: flex; gap: 28px; }
.item { text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; color: var(--rosa); padding: 6px 0; border-bottom: 2px solid transparent; }
.item.ativo, .item:hover { border-color: var(--rosa); }
.acoes { display: flex; gap: 6px; }
.icone-link { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: var(--rosa); }
.icone-link:hover { background: var(--rosa-claro); }
.icone-link .icone { width: 22px; height: 22px; }
@media (max-width: 640px) { .so-desktop { display: none !important; } .menu { gap: 16px; } }
</style>
