<script setup>
import { computed, ref } from 'vue'
import Icone from '../Icone.vue'
import { formatarPreco, linkWhatsapp } from '../../lib/formato.js'

const props = defineProps({
  produto: { type: Object, required: true },
  whatsapp: { type: String, default: '' },
  nomeCategoria: { type: String, default: '' },
})

const disponiveis = computed(() => props.produto.tamanhos.filter((t) => t.disponivel))
const esgotado = computed(() => props.produto.situacao === 'esgotado')
// Se só há um tamanho disponível, já vem escolhido.
const escolhido = ref(disponiveis.value.length === 1 ? disponiveis.value[0].tamanho : null)

const link = computed(() => {
  const p = props.produto
  const tam = escolhido.value ? `tamanho ${escolhido.value}` : 'tamanho a combinar'
  return linkWhatsapp(
    props.whatsapp,
    `Olá! Vi no site e quero esta peça:\n*${p.nome}*${p.cor ? ` - cor ${p.cor}` : ''} (código ${p.codigo})\n${tam} - ${formatarPreco(p.preco)}\nAinda está disponível?`,
  )
})
</script>

<template>
  <article class="card" :class="{ esgotado }">
    <div class="foto">
      <img v-if="produto.imagem" :src="produto.imagem" :alt="produto.cor ? `${produto.nome} - ${produto.cor}` : produto.nome" loading="lazy" width="600" height="800" />
      <div v-else class="sem-foto"><Icone nome="camera" /><span>Foto em breve</span></div>
      <span v-if="esgotado" class="etiqueta">ESGOTADO</span>
    </div>
    <div class="info">
      <p v-if="nomeCategoria" class="categoria">{{ nomeCategoria }}</p>
      <h3 class="nome">{{ produto.nome }}</h3>
      <p v-if="produto.cor" class="cor">Cor: {{ produto.cor }}</p>
      <p class="preco">{{ formatarPreco(produto.preco) }}</p>

      <div class="tamanhos" role="group" :aria-label="`Tamanhos de ${produto.nome}`">
        <button
          v-for="t in produto.tamanhos"
          :key="t.tamanho"
          type="button"
          class="tam"
          :class="{ escolhido: escolhido === t.tamanho }"
          :disabled="!t.disponivel"
          :aria-pressed="escolhido === t.tamanho"
          :title="t.disponivel ? `Tamanho ${t.tamanho}` : `Tamanho ${t.tamanho} esgotado`"
          @click="escolhido = escolhido === t.tamanho ? null : t.tamanho"
        >{{ t.tamanho }}</button>
      </div>

      <a v-if="!esgotado && whatsapp" :href="link" target="_blank" rel="noopener" class="btn comprar">
        <Icone nome="whatsapp" /> Quero essa
      </a>
      <span v-else-if="esgotado" class="btn comprar indisponivel" aria-disabled="true">Esgotado</span>
    </div>
  </article>
</template>

<style scoped>
.card { background: var(--branco); border-radius: var(--raio); overflow: hidden; box-shadow: var(--sombra); display: flex; flex-direction: column; min-width: 0; }
.foto { position: relative; aspect-ratio: 3 / 4; background: var(--rosa-claro); max-width: 100%; }
.foto img { width: 100%; height: 100%; object-fit: cover; }
.esgotado .foto img { filter: grayscale(.6) opacity(.7); }
.sem-foto { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8px; color: var(--rosa); font-size: 13px; font-weight: 600; opacity: .7; }
.sem-foto .icone { width: 34px; height: 34px; }
.etiqueta {
  position: absolute; top: 12px; left: 12px; background: var(--texto); color: var(--branco);
  font-size: 12px; font-weight: 700; letter-spacing: .14em; padding: 6px 10px; border-radius: 6px;
}
.info { padding: 12px 12px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.categoria { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--texto-suave); }
.nome { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.3; color: var(--texto); }
.cor { margin: -2px 0 0; font-size: 13px; color: var(--texto-suave); }
.preco { margin: 0; font-size: 17px; font-weight: 700; color: var(--rosa); }
.tamanhos { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 6px; }
.tam {
  min-width: 34px; height: 32px; padding: 0 8px; border-radius: 8px; border: 1.5px solid var(--borda);
  background: var(--branco); font-size: 13px; font-weight: 600; color: var(--texto); cursor: pointer;
}
.tam:hover:not(:disabled) { border-color: var(--rosa); }
.tam.escolhido { background: var(--rosa); border-color: var(--rosa); color: var(--branco); }
.tam:disabled { color: #c5a9b7; text-decoration: line-through; cursor: not-allowed; background: #faf3f7; }
.comprar { margin-top: auto; width: 100%; padding: 10px 12px; font-size: 14px; }
.indisponivel { background: #eadde4; border-color: #eadde4; color: var(--texto-suave); cursor: not-allowed; }
.indisponivel:hover { background: #eadde4; border-color: #eadde4; }
@media (max-width: 420px) {
  .info { padding: 10px 10px 12px; }
  .nome { font-size: 14px; }
  .comprar { font-size: 13px; padding: 9px 8px; }
}
</style>
