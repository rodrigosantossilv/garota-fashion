import { createRouter, createWebHistory } from 'vue-router'
import { quandoSessaoExpirar } from './lib/api.js'
import { usePainel } from './stores/painel.js'

// O painel é carregado separado (import dinâmico): a cliente nunca baixa esse código.
const painel = (arquivo) => () => import(`./views/painel/${arquivo}.vue`)

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, salvo) => salvo || (to.hash ? { el: to.hash, top: 90 } : { top: 0 }),
  routes: [
    { path: '/', name: 'abertura', component: () => import('./views/vitrine/Abertura.vue') },
    { path: '/catalogo/:categoria?', name: 'catalogo', component: () => import('./views/vitrine/Catalogo.vue') },
    { path: '/painel/entrar', name: 'entrar', component: painel('Entrar'), meta: { painel: true } },
    {
      path: '/painel',
      component: painel('Layout'),
      meta: { painel: true, precisaLogin: true },
      children: [
        { path: '', name: 'estoque', component: painel('Estoque') },
        { path: 'novas', name: 'novas', component: painel('NovasPecas') },
        { path: 'produtos', name: 'produtos', component: painel('Produtos') },
        { path: 'produtos/novo', name: 'produto-novo', component: painel('ProdutoForm') },
        { path: 'produtos/:codigo', name: 'produto-editar', component: painel('ProdutoForm'), props: true },
        { path: 'categorias', name: 'categorias', component: painel('Categorias') },
        { path: 'planilha', name: 'planilha', component: painel('Planilha') },
        { path: 'conta', name: 'conta', component: painel('Conta') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  if (!to.matched.some((r) => r.meta.precisaLogin)) return true
  const store = usePainel()
  if (store.usuario) return true
  if (await store.verificarSessao()) return true
  return { name: 'entrar', query: { volta: to.fullPath } }
})

router.afterEach((to) => {
  // Páginas do painel não devem aparecer no Google.
  let meta = document.querySelector('meta[name="robots"]')
  if (to.meta.painel) {
    if (!meta) {
      meta = Object.assign(document.createElement('meta'), { name: 'robots' })
      document.head.appendChild(meta)
    }
    meta.content = 'noindex, nofollow'
    document.title = 'Painel | Garota Fashion'
  } else {
    meta?.remove()
    document.title = 'Garota Fashion | Moda Feminina em Feira de Santana'
  }
})

quandoSessaoExpirar(() => {
  usePainel().usuario = null
  const atual = router.currentRoute.value
  if (atual.meta.precisaLogin) router.push({ name: 'entrar', query: { volta: atual.fullPath, expirou: '1' } })
})
