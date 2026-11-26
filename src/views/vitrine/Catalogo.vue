<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Cabecalho from '../../components/vitrine/Cabecalho.vue'
import Rodape from '../../components/vitrine/Rodape.vue'
import CardProduto from '../../components/vitrine/CardProduto.vue'
import Icone from '../../components/Icone.vue'
import { useVitrine } from '../../stores/vitrine.js'
import { IMAGEM_CABECALHO, LOJA } from '../../config/loja.js'

const vitrine = useVitrine()
const route = useRoute()
onMounted(() => vitrine.carregar())

const categoriaAtual = computed(() => route.params.categoria || null)
const nomeCategoria = (slug) => vitrine.categorias.find((c) => c.slug === slug)?.nome || ''
const lista = computed(() =>
  categoriaAtual.value ? vitrine.produtos.filter((p) => p.categoria === categoriaAtual.value) : vitrine.produtos,
)
// Cards de categoria: usa a foto de uma peça da categoria, se houver.
const cardsCategoria = computed(() =>
  vitrine.categorias.map((c) => ({
    ...c,
    imagem: vitrine.produtos.find((p) => p.categoria === c.slug && p.imagem)?.imagem || null,
    total: vitrine.produtos.filter((p) => p.categoria === c.slug).length,
  })),
)
</script>

<template>
  <div class="pagina">
    <Cabecalho :loja="vitrine.loja" />

    <main>
      <!-- Banner do topo -->
      <!-- Com a foto da loja: layout editorial (texto à esquerda, modelo à direita) -->
      <section v-if="IMAGEM_CABECALHO" class="destaque">
        <span class="marca-fundo" aria-hidden="true">GAROTA</span>
        <img :src="IMAGEM_CABECALHO" alt="Modelo vestindo look da Garota Fashion" class="destaque-foto" width="1024" height="1280" fetchpriority="high" />
        <div class="destaque-texto">
          <p class="destaque-eyebrow">Moda feminina / Estilo / Você</p>
          <h1>Invista no<br />melhor look.</h1>
          <p class="destaque-sub">Peças escolhidas para você. Escolha a sua e fale com a gente pelo WhatsApp.</p>
          <a href="#pecas" class="destaque-btn">Ver peças <Icone nome="seta" /></a>
        </div>
        <p class="destaque-local" aria-hidden="true"><span></span>{{ LOJA.cidade }}<br />@fashiongarotta</p>
      </section>

      <section v-else class="hero">
        <div class="hero-placeholder" aria-hidden="true">
          <Icone nome="camera" />
          <strong>ESPAÇO PARA A IMAGEM DO CABEÇALHO</strong>
          <span>Troque em src/config/loja.js</span>
        </div>
        <div class="hero-texto">
          <p class="eyebrow">Moda feminina · {{ LOJA.cidade }}</p>
          <h1>{{ LOJA.frase }}</h1>
          <a href="#pecas" class="btn">Ver peças <Icone nome="seta" /></a>
        </div>
      </section>

      <!-- Cards de categorias -->
      <section v-if="cardsCategoria.length" class="secao" aria-labelledby="t-cat">
        <h2 id="t-cat" class="titulo-secao">Categorias</h2>
        <div class="categorias">
          <RouterLink v-for="c in cardsCategoria" :key="c.slug" :to="{ name: 'catalogo', params: { categoria: c.slug }, hash: '#pecas' }" class="cat-card">
            <img v-if="c.imagem" :src="c.imagem" alt="" loading="lazy" />
            <span class="cat-texto">
              <strong>{{ c.nome }}</strong>
              <small>Ver peças <Icone nome="seta" /></small>
            </span>
          </RouterLink>
        </div>
      </section>

      <!-- Produtos -->
      <section id="pecas" class="secao" aria-labelledby="t-pecas">
        <div class="titulo-linha">
          <h2 id="t-pecas" class="titulo-secao">{{ categoriaAtual ? nomeCategoria(categoriaAtual) || 'Peças' : 'Nossas peças' }}</h2>
        </div>

        <nav v-if="vitrine.categorias.length" class="filtros" aria-label="Filtrar por categoria">
          <RouterLink :to="{ name: 'catalogo', hash: '#pecas' }" class="chip" :class="{ ativo: !categoriaAtual }">Todas</RouterLink>
          <RouterLink v-for="c in vitrine.categorias" :key="c.slug" :to="{ name: 'catalogo', params: { categoria: c.slug }, hash: '#pecas' }"
            class="chip" :class="{ ativo: categoriaAtual === c.slug }">{{ c.nome }}</RouterLink>
        </nav>

        <p v-if="vitrine.erro" class="vazio">{{ vitrine.erro }}</p>
        <div v-else-if="!vitrine.carregado" class="grade" aria-busy="true">
          <div v-for="i in 4" :key="i" class="esqueleto"></div>
        </div>
        <div v-else-if="lista.length === 0" class="vazio">
          <span class="marca">Em breve!</span>
          <p>Estamos preparando as novidades. Enquanto isso, fale com a gente pelo WhatsApp ou siga no Instagram.</p>
        </div>
        <div v-else class="grade">
          <CardProduto v-for="p in lista" :key="p.codigo" :produto="p" :whatsapp="vitrine.loja.whatsapp"
            :nome-categoria="categoriaAtual ? '' : nomeCategoria(p.categoria)" />
        </div>
      </section>
    </main>

    <Rodape :loja="vitrine.loja" />
  </div>
</template>

<style scoped>
/* coluna que ocupa a tela toda: o rodapé fica sempre no fim, mesmo com pouco conteúdo */
.pagina { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: linear-gradient(180deg, var(--fundo-topo) 0%, var(--fundo-topo) 40%, #fbe6fb 100%); }
main { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 16px var(--gutter-d) 0 var(--gutter-e); }

.hero {
  position: relative; border-radius: 20px; overflow: hidden; min-height: 300px;
  display: flex; align-items: flex-end;
  background: linear-gradient(120deg, var(--rosa-claro), var(--fundo-meio) 55%, var(--lilas));
}
/* ----- Cabeçalho com foto (inspirado no layout de referência) ----- */
.destaque {
  --mauve: #95858f;
  position: relative; overflow: hidden; border-radius: 20px; min-height: 460px;
  background: linear-gradient(180deg, #958590 0%, #9a8994 55%, #8f7f8a 100%);
  color: #fff; display: flex; align-items: center;
}
/* escurece a esquerda (tom vinho da marca) para o texto ler bem */
.destaque::before {
  content: ''; position: absolute; inset: 0; z-index: 2;
  background: linear-gradient(90deg, rgba(58, 15, 37, .62) 0%, rgba(58, 15, 37, .35) 38%, rgba(58, 15, 37, 0) 62%);
}
.marca-fundo {
  position: absolute; z-index: 0; right: -1%; top: 50%; transform: translateY(-50%);
  font-family: 'Archivo', var(--fonte); font-weight: 900; font-size: clamp(80px, 12.5vw, 176px);
  letter-spacing: -.03em; line-height: 1; color: rgba(255, 255, 255, .92); white-space: nowrap;
}
.destaque-foto {
  position: absolute; z-index: 1; bottom: 0; right: 18%; height: 100%; width: auto; max-width: none;
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
}
.destaque-texto { position: relative; z-index: 3; padding: 40px 36px; max-width: 470px; }
.destaque-eyebrow {
  margin: 0 0 14px; font-family: 'Archivo', var(--fonte); font-weight: 600; font-size: 12px;
  letter-spacing: .22em; text-transform: uppercase;
}
.destaque h1 {
  margin: 0 0 16px; font-family: 'Archivo', var(--fonte); font-weight: 900; text-transform: uppercase;
  font-size: clamp(38px, 5.2vw, 60px); line-height: .98; letter-spacing: -.01em;
}
.destaque-sub { margin: 0 0 26px; font-size: 15px; line-height: 1.55; max-width: 290px; opacity: .95; }
.destaque-btn {
  display: inline-flex; align-items: center; gap: 12px; padding: 13px 22px;
  border: 1.5px solid #fff; border-radius: 2px; color: #fff; text-decoration: none;
  font-family: 'Archivo', var(--fonte); font-weight: 600; font-size: 13px; letter-spacing: .16em; text-transform: uppercase;
  transition: background .2s, color .2s;
}
.destaque-btn:hover { background: #fff; color: var(--rosa-escuro); }
.destaque-local {
  position: absolute; z-index: 3; right: 26px; bottom: 22px; margin: 0; text-align: right;
  font-family: 'Archivo', var(--fonte); font-weight: 600; font-size: 11px; letter-spacing: .14em; line-height: 1.7; text-transform: uppercase;
}
.destaque-local span { display: block; width: 44px; height: 1px; background: #fff; margin: 0 0 8px auto; }
@media (max-width: 760px) {
  .destaque { min-height: 560px; align-items: flex-end; }
  .destaque::before { background: linear-gradient(0deg, rgba(58, 15, 37, .82) 0%, rgba(58, 15, 37, .45) 42%, rgba(58, 15, 37, 0) 70%); }
  .destaque-foto { right: 50%; transform: translateX(50%); }
  .marca-fundo { display: none; }
  .destaque-texto { padding: 24px 20px 26px; }
  .destaque-local { display: none; }
}
.hero-placeholder {
  position: absolute; inset: 14px; border: 2px dashed rgba(201,36,95,.45); border-radius: 14px;
  display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start; gap: 4px;
  padding: 16px; color: var(--rosa); text-align: right;
  background: repeating-linear-gradient(-45deg, transparent 0 14px, rgba(255,255,255,.25) 14px 28px);
}
.hero-placeholder .icone { width: 28px; height: 28px; }
.hero-placeholder strong { font-size: 12px; letter-spacing: .12em; }
.hero-placeholder span { font-size: 11px; font-family: ui-monospace, monospace; opacity: .8; }
.hero-texto { position: relative; z-index: 1; padding: 28px 26px; max-width: 560px; }
.hero:not(.com-imagem) .hero-texto { padding-top: 96px; }
.eyebrow { margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: var(--rosa); }
.hero h1 { margin: 0 0 20px; font-family: var(--fonte-marca); font-weight: 400; color: var(--rosa); font-size: clamp(36px, 6vw, 60px); line-height: 1.05; }

.secao { margin-top: 36px; scroll-margin-top: 80px; }
.titulo-secao { margin: 0 0 16px; font-size: 14px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--rosa); }

.categorias { display: grid; grid-auto-flow: column; grid-auto-columns: clamp(150px, 42vw, 230px); gap: 14px; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; }
.cat-card {
  position: relative; aspect-ratio: 4 / 5; border-radius: var(--raio); overflow: hidden; text-decoration: none; scroll-snap-align: start;
  background: linear-gradient(160deg, var(--rosa) 0%, var(--rosa-escuro) 100%); max-width: 100%;
}
.cat-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
.cat-card:hover img { transform: scale(1.05); }
.cat-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(74,21,48,.75)); }
.cat-texto { position: absolute; left: 14px; right: 14px; bottom: 12px; z-index: 1; color: var(--branco); display: flex; flex-direction: column; gap: 2px; }
.cat-texto strong { font-size: 15px; letter-spacing: .08em; text-transform: uppercase; }
.cat-texto small { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; opacity: .9; }

.filtros {
  position: sticky; top: calc(env(safe-area-inset-top, 0px) + 61px); z-index: 10;
  display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin-bottom: 8px;
  background: var(--fundo-topo);
}
.chip {
  flex-shrink: 0; text-decoration: none; padding: 8px 16px; border-radius: 999px; font-size: 14px; font-weight: 600;
  border: 1.5px solid var(--borda); background: var(--branco); color: var(--texto);
}
.chip:hover { border-color: var(--rosa); }
.chip.ativo { background: var(--rosa); border-color: var(--rosa); color: var(--branco); }

.grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
@media (max-width: 560px) { .grade { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } .hero { min-height: 260px; } .hero-texto { padding: 22px 18px; } .hero:not(.com-imagem) .hero-texto { padding-top: 130px; } }
.esqueleto { aspect-ratio: 3 / 5; border-radius: var(--raio); background: linear-gradient(90deg, #f6e3ee, #fdf2f8, #f6e3ee); background-size: 200% 100%; animation: brilho 1.2s infinite linear; }
@keyframes brilho { to { background-position: -200% 0; } }
.vazio { text-align: center; padding: 40px 16px; color: var(--texto-suave); background: var(--branco); border-radius: var(--raio); box-shadow: var(--sombra); }
.vazio .marca { font-size: 40px; }
.vazio p { max-width: 420px; margin: 12px auto 0; line-height: 1.6; }
</style>
