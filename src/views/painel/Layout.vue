<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icone from '../../components/Icone.vue'
import Avisos from '../../components/painel/Avisos.vue'
import Dialogo from '../../components/painel/Dialogo.vue'
import { usePainel } from '../../stores/painel.js'
import '../../estilos/painel.css'

const store = usePainel()
const router = useRouter()
const erro = ref('')

const links = [
  { to: { name: 'estoque' }, nome: 'Estoque', icone: 'estoque' },
  { to: { name: 'novas' }, nome: 'Novas', longo: 'Novas peças', icone: 'mais', contador: true },
  { to: { name: 'produtos' }, nome: 'Produtos', icone: 'etiqueta' },
  { to: { name: 'categorias' }, nome: 'Categorias', icone: 'pasta' },
  { to: { name: 'planilha' }, nome: 'Planilha', icone: 'planilha' },
  { to: { name: 'conta' }, nome: 'Conta', icone: 'usuario' },
]

// Ao "Adicionar à loja" uma peça nova, o menu destaca "Novas peças"; nas demais edições, "Produtos".
const ativo = (nome) => {
  const r = router.currentRoute.value
  if (r.name === 'produto-editar' && r.query.publicar) return nome === 'novas'
  if (r.name?.startsWith('produto-')) return nome === 'produtos'
  return r.name === nome
}

async function carregar() {
  erro.value = ''
  try {
    await store.carregar()
  } catch (e) {
    erro.value = e.message
  }
}

async function sair() {
  await store.sair()
  router.replace({ name: 'entrar' })
}

// Não deixa sair da página com ajuste de estoque ainda não enviado.
const antesDeSair = (e) => {
  if (store.temAjustesPendentes || store.salvandoAjustes) {
    store.salvarAjustesAgora().catch(() => {})
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => {
  carregar()
  window.addEventListener('beforeunload', antesDeSair)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', antesDeSair))
</script>

<template>
  <div class="painel">
    <aside class="lateral">
      <div class="logo"><span class="marca">Garota</span><span class="marca-sub">FASHION</span><small>Painel</small></div>
      <nav class="nav" aria-label="Painel">
        <RouterLink v-for="l in links" :key="l.nome" :to="l.to" class="nav-item" :class="{ ativo: ativo(l.to.name) }">
          <Icone :nome="l.icone" /> <span class="longo">{{ l.longo || l.nome }}</span><span class="curto">{{ l.nome }}</span>
          <span v-if="l.contador && store.novasPecas.length" class="contador" :aria-label="`${store.novasPecas.length} aguardando`">{{ store.novasPecas.length }}</span>
        </RouterLink>
      </nav>
      <div class="rodape-lateral">
        <a href="/catalogo" target="_blank" rel="noopener" class="ver-loja">Ver a loja ↗</a>
        <button type="button" class="nav-item sair" @click="sair"><Icone nome="sair" /> <span>Sair</span></button>
      </div>
    </aside>

    <header class="topo-mobile">
      <span class="marca">Garota</span>
      <span class="usuario">{{ store.usuario?.nome }}</span>
      <button type="button" class="btn btn-claro btn-pequeno" @click="sair">Sair</button>
    </header>

    <main class="conteudo">
      <p v-if="erro" class="p-erro">{{ erro }} <button class="btn btn-pequeno" @click="carregar">Tentar de novo</button></p>
      <div v-else-if="!store.carregado" class="p-vazio">Carregando…</div>
      <RouterView v-else />
    </main>

    <Avisos />
    <Dialogo />
  </div>
</template>

<style scoped>
.painel { min-height: 100vh; background: #fdf6fa; }
.lateral {
  position: fixed; z-index: 30; display: flex; flex-direction: column;
  background: var(--branco); border-right: 1px solid var(--borda);
}
.logo { display: flex; flex-direction: column; align-items: center; padding: 22px 0 18px; }
.logo .marca { font-size: 36px; }
.logo .marca-sub { font-size: 9px; margin: 3px 0 0 .5em; }
.logo small { margin-top: 8px; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--texto-suave); }
.nav { display: flex; flex-direction: column; gap: 4px; padding: 0 12px; }
.nav-item {
  display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; text-decoration: none;
  font-weight: 600; font-size: 15px; color: var(--texto); border: 0; background: none; cursor: pointer; width: 100%;
}
.nav-item:hover { background: var(--rosa-claro); }
.nav-item.ativo { background: var(--rosa); color: var(--branco); }
.nav-item { position: relative; }
.curto { display: none; }
@media (max-width: 899px) { .curto { display: inline; } }
.contador { margin-left: auto; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--rosa); color: var(--branco); font-size: 11px; font-weight: 700; display: grid; place-items: center; }
.nav-item.ativo .contador { background: var(--branco); color: var(--rosa); }
.rodape-lateral { margin-top: auto; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.ver-loja { font-size: 13px; font-weight: 600; color: var(--rosa); padding: 8px 14px; }
.topo-mobile { display: none; }
.conteudo { padding: 24px var(--gutter-d) 40px var(--gutter-e); }

@media (min-width: 900px) {
  .lateral { inset: 0 auto 0 0; width: 230px; }
  .conteudo { margin-left: 230px; padding: 28px 32px 48px; max-width: 1180px; }
}
@media (max-width: 899px) {
  .lateral {
    inset: auto 0 0 0; border-right: 0; border-top: 1px solid var(--borda);
    padding: 4px max(4px, env(safe-area-inset-right, 0px)) calc(4px + env(safe-area-inset-bottom, 0px)) max(4px, env(safe-area-inset-left, 0px));
  }
  .logo, .rodape-lateral { display: none; }
  .nav { flex-direction: row; padding: 0; gap: 0; }
  .nav-item { flex-direction: column; gap: 3px; padding: 8px 2px; font-size: 11px; justify-content: center; border-radius: 8px; }
  .nav-item .icone { width: 22px; height: 22px; }
  .longo { display: none; }
  .contador { position: absolute; top: 2px; right: calc(50% - 22px); margin: 0; min-width: 18px; height: 18px; font-size: 10px; }
  .topo-mobile {
    display: flex; align-items: center; gap: 12px; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 20;
    background: var(--branco); border-bottom: 1px solid var(--borda); padding: 8px var(--gutter-d) 8px var(--gutter-e);
  }
  .topo-mobile .marca { font-size: 28px; }
  .usuario { margin-left: auto; font-size: 13px; color: var(--texto-suave); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .conteudo { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
}
</style>
