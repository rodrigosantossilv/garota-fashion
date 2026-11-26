<script setup>
// Tela de abertura animada (a mesma aprovada pela cliente) seguida do menu.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icone from '../../components/Icone.vue'
import { useVitrine } from '../../stores/vitrine.js'
import { formatarTelefone, linkWhatsapp } from '../../lib/formato.js'

const vitrine = useVitrine()
const etapa = ref('abertura')
const letras = 'Garota'.split('')
let temporizador
const brilhos = Array.from({ length: 14 }, (_, i) => ({
  s: ['✦', '✧', '♡', '✦'][i % 4],
  left: Math.random() * 100 + 'vw',
  top: 20 + Math.random() * 70 + 'vh',
  size: 10 + Math.random() * 18 + 'px',
  delay: Math.random() * 6 + 's',
}))

onMounted(() => {
  vitrine.carregar()
  temporizador = setTimeout(() => (etapa.value = 'menu'), 6500)
})
onBeforeUnmount(() => clearTimeout(temporizador))
</script>

<template>
  <div class="pagina">
    <span v-for="(b, i) in brilhos" :key="i" class="brilho" aria-hidden="true"
      :style="{ left: b.left, top: b.top, fontSize: b.size, animationDelay: b.delay }">{{ b.s }}</span>

    <Transition name="troca" mode="out-in">
      <section v-if="etapa === 'abertura'" key="a" class="tela">
        <h1 class="nome" aria-label="Garota Fashion">
          <span class="marca garota" aria-hidden="true">
            <span v-for="(l, i) in letras" :key="i" :style="{ animationDelay: 0.2 + i * 0.15 + 's' }">{{ l }}</span>
          </span>
          <span class="marca-sub fashion">FASHION</span>
        </h1>
        <p class="boas-vindas">Seja bem-vinda ao nosso site</p>
        <div class="linha"></div>
        <button class="entrar" type="button" @click="etapa = 'menu'">Entrar</button>
      </section>

      <section v-else key="m" class="tela menu">
        <h1 class="nome">
          <span class="marca garota-menu">Garota</span>
          <span class="marca-sub fashion-menu">FASHION</span>
        </h1>
        <nav class="botoes">
          <a v-if="vitrine.loja.whatsapp" class="botao" :href="linkWhatsapp(vitrine.loja.whatsapp, 'Olá! Vim pelo site da Garota Fashion.')" target="_blank" rel="noopener">
            <Icone nome="whatsapp" /> Atendimento ao cliente
          </a>
          <RouterLink class="botao" to="/catalogo"><Icone nome="sacola" /> Catálogo</RouterLink>
        </nav>
      </section>
    </Transition>

    <footer class="rodape">
      <a v-if="vitrine.loja.instagram" :href="`https://www.instagram.com/${vitrine.loja.instagram}`" target="_blank" rel="noopener">
        <Icone nome="instagram" /> @{{ vitrine.loja.instagram }}
      </a>
      <span v-else></span>
      <a v-if="vitrine.loja.whatsapp" :href="linkWhatsapp(vitrine.loja.whatsapp)" target="_blank" rel="noopener">
        <Icone nome="telefone" /> {{ formatarTelefone(vitrine.loja.whatsapp) }}
      </a>
    </footer>
  </div>
</template>

<style scoped>
.pagina {
  min-height: 100vh; min-height: 100dvh; position: relative; overflow: hidden;
  background: linear-gradient(180deg, var(--fundo-topo) 0%, var(--fundo-meio) 45%, var(--lilas) 100%);
  display: flex; flex-direction: column;
}
.tela {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px var(--gutter-d) 24px var(--gutter-e); text-align: center;
}
.nome { margin: 0; display: flex; flex-direction: column; align-items: center; }
.garota { font-size: clamp(64px, 16vw, 170px); letter-spacing: 2px; }
.garota span { display: inline-block; opacity: 0; transform: translateY(40px) rotate(-8deg); animation: letra .7s cubic-bezier(.2,.9,.3,1.3) forwards; }
.fashion { font-size: clamp(16px, 3.4vw, 34px); margin: 8px 0 0 .5em; opacity: 0; animation: aparece 1s ease 1.3s forwards; }
.boas-vindas { margin: 36px 0 0; color: var(--rosa); font-size: clamp(18px, 3.6vw, 30px); font-weight: 500; opacity: 0; animation: sobe 1s ease 1.9s forwards; }
.linha { width: 0; height: 2px; background: var(--rosa); margin-top: 18px; border-radius: 2px; animation: cresce 1s ease 2.4s forwards; }
.entrar {
  margin-top: 40px; background: none; border: 2px solid var(--rosa); color: var(--rosa); font-weight: 600; font-size: 14px;
  letter-spacing: .2em; text-transform: uppercase; padding: 12px 34px; border-radius: 40px; cursor: pointer;
  opacity: 0; animation: aparece 1s ease 3s forwards;
}
.entrar:hover { background: var(--rosa); color: var(--branco); }

.garota-menu { font-size: clamp(54px, 11vw, 110px); }
.fashion-menu { font-size: clamp(13px, 2.4vw, 22px); margin: 6px 0 0 .5em; }
.botoes { margin-top: 56px; display: flex; flex-direction: column; gap: 24px; width: min(340px, 100%); }
.botao {
  display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--branco); color: var(--rosa);
  text-decoration: none; font-weight: 700; font-size: 17px; padding: 16px 20px; border-radius: 12px;
  box-shadow: 4px 4px 0 rgba(201,36,95,.25), 0 6px 18px rgba(201,36,95,.12); transition: transform .25s, background .25s, color .25s;
}
.botao:hover { transform: translateY(-3px); background: var(--rosa); color: var(--branco); }
.botao .icone { width: 22px; height: 22px; }

.rodape {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 20px var(--gutter-d) calc(20px + env(safe-area-inset-bottom, 0px)) var(--gutter-e);
  font-weight: 600; font-size: clamp(14px, 2.4vw, 20px);
}
.rodape a { color: var(--rosa); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
.rodape a:hover { text-decoration: underline; }

.brilho { position: absolute; color: var(--rosa); opacity: 0; pointer-events: none; animation: flutua 6s ease-in-out infinite; }

.troca-enter-active, .troca-leave-active { transition: opacity .6s ease, transform .6s ease; }
.troca-enter-from, .troca-leave-to { opacity: 0; transform: scale(1.03); }

@keyframes letra { to { opacity: 1; transform: none; } }
@keyframes aparece { to { opacity: 1; } }
@keyframes sobe { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes cresce { to { width: min(220px, 50vw); } }
@keyframes flutua { 0% { opacity: 0; transform: translateY(0) scale(.6); } 30% { opacity: .7; } 100% { opacity: 0; transform: translateY(-80px) scale(1.1); } }
</style>
