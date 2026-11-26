import { defineStore } from 'pinia'

/**
 * Pop-up de confirmação nas cores da loja (substitui o confirm() do navegador).
 * Uso: if (await useDialogo().confirmar({ titulo, mensagem })) { ... }
 */
export const useDialogo = defineStore('dialogo', {
  state: () => ({ aberto: null }),
  actions: {
    confirmar({ titulo, mensagem, ok = 'Continuar', cancelar = 'Voltar', tom = 'normal' }) {
      this.aberto?.resolver(false)
      return new Promise((resolver) => {
        this.aberto = { titulo, mensagem, ok, cancelar, tom, resolver }
      })
    },
    responder(valor) {
      const atual = this.aberto
      this.aberto = null
      atual?.resolver(valor)
    },
  },
})
