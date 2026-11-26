import { defineStore } from 'pinia'

export const useVitrine = defineStore('vitrine', {
  state: () => ({ loja: { whatsapp: '', instagram: '' }, categorias: [], produtos: [], carregado: false, erro: '' }),
  actions: {
    async carregar() {
      if (this.carregado) return
      try {
        const resp = await fetch('/catalogo.json', { cache: 'no-cache' })
        if (!resp.ok) throw new Error()
        Object.assign(this, await resp.json(), { carregado: true, erro: '' })
      } catch {
        this.erro = 'Não foi possível carregar o catálogo. Verifique sua internet e tente novamente.'
      }
    },
  },
})
