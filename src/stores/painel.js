import { defineStore } from 'pinia'
import { api } from '../lib/api.js'
import { situacaoPainel } from '../../lib/situacao.js'

const ESPERA_AJUSTES_MS = 2500

export const usePainel = defineStore('painel', {
  state: () => ({
    usuario: null,
    produtos: [],
    categorias: [],
    config: { limiteEstoqueBaixo: 3, whatsapp: '', instagram: '' },
    importacoes: [],
    armazenamento: 'local',
    carregado: false,
    avisos: [],
    ajustesPendentes: {}, // "codigo|tamanho" -> quantidade
    salvandoAjustes: false,
  }),

  getters: {
    nomeCategoria: (s) => (slug) => (slug ? s.categorias.find((c) => c.slug === slug)?.nome || slug : 'Sem categoria'),
    /** Peças que ainda não estão na loja (vieram da planilha ou foram salvas sem foto). */
    novasPecas: (s) => s.produtos.filter((p) => p.rascunho).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    pecasPublicadas: (s) => s.produtos.filter((p) => !p.rascunho),
    situacaoDe: (s) => (p) => situacaoPainel(p, s.config.limiteEstoqueBaixo),
    temAjustesPendentes: (s) => Object.keys(s.ajustesPendentes).length > 0,
    /** Texto mostrado após salvar, conforme onde os dados são gravados. */
    avisoPublicacao: (s) =>
      s.armazenamento === 'github' ? 'Salvo! A vitrine atualiza em cerca de 1 minuto.' : 'Salvo!',
  },

  actions: {
    avisar(texto, tipo = 'ok') {
      const id = Math.random()
      this.avisos.push({ id, texto, tipo })
      setTimeout(() => (this.avisos = this.avisos.filter((a) => a.id !== id)), tipo === 'erro' ? 7000 : 4500)
    },

    async verificarSessao() {
      try {
        this.usuario = (await api('GET', 'auth/eu')).usuario
        return true
      } catch {
        return false
      }
    },
    async entrar(email, senha) {
      this.usuario = (await api('POST', 'auth/login', { corpo: { email, senha } })).usuario
    },
    async sair() {
      await this.salvarAjustesAgora().catch(() => {})
      await api('POST', 'auth/logout').catch(() => {})
      this.$reset()
    },
    async trocarSenha(senhaAtual, novaSenha) {
      await api('POST', 'auth/senha', { corpo: { senhaAtual, novaSenha } })
    },

    async carregar(forcar = false) {
      if (this.carregado && !forcar) return
      const d = await api('GET', 'painel')
      Object.assign(this, {
        produtos: d.produtos,
        categorias: d.categorias,
        config: d.config,
        importacoes: d.importacoes,
        armazenamento: d.armazenamento,
        carregado: true,
      })
    },

    // ----- Categorias -----
    async criarCategoria(nome) {
      const { categoria } = await api('POST', 'categorias', { corpo: { nome } })
      this.categorias.push(categoria) // aparece na hora, sem recarregar
      return categoria
    },
    async editarCategoria(slug, campos) {
      const { categoria } = await api('PUT', 'categorias', { query: { slug }, corpo: campos })
      Object.assign(this.categorias.find((c) => c.slug === slug), categoria)
      this.categorias.sort((a, b) => a.ordem - b.ordem)
    },
    async removerCategoria(slug, moverPara) {
      const r = await api('DELETE', 'categorias', { query: moverPara ? { slug, moverPara } : { slug, semCategoria: '1' } })
      this.categorias = this.categorias.filter((c) => c.slug !== slug)
      if (r.movidos) this.produtos.forEach((p) => p.categoria === slug && (p.categoria = moverPara || null))
      return r
    },

    // ----- Produtos -----
    async salvarProduto(codigo, campos) {
      if (codigo) {
        const { produto } = await api('PUT', 'produtos', { query: { codigo }, corpo: campos })
        Object.assign(this.produtos.find((p) => p.codigo === codigo), produto)
        return produto
      }
      const { produto } = await api('POST', 'produtos', { corpo: campos })
      this.produtos.push(produto)
      return produto
    },
    async enviarImagem(codigo, imagem) {
      const { produto } = await api('PUT', 'produtos/imagem', { query: { codigo }, corpo: { imagem } })
      Object.assign(this.produtos.find((p) => p.codigo === codigo), produto)
      return produto
    },
    async removerProduto(codigo) {
      await api('DELETE', 'produtos', { query: { codigo } })
      this.produtos = this.produtos.filter((p) => p.codigo !== codigo)
    },

    // ----- Estoque: ajustes rápidos agrupados (um único envio após alguns segundos) -----
    ajustarQuantidade(codigo, tamanho, quantidade) {
      const q = Math.max(0, Math.min(99999, Math.round(Number(quantidade) || 0)))
      const t = this.produtos.find((p) => p.codigo === codigo)?.tamanhos.find((x) => x.tamanho === tamanho)
      if (!t) return
      t.quantidade = q
      this.ajustesPendentes[`${codigo}|${tamanho}`] = q
      clearTimeout(this._temporizador)
      this._temporizador = setTimeout(() => this.salvarAjustesAgora().catch(() => {}), ESPERA_AJUSTES_MS)
    },
    async salvarAjustesAgora() {
      clearTimeout(this._temporizador)
      if (!this.temAjustesPendentes || this.salvandoAjustes) return
      const lote = this.ajustesPendentes
      this.ajustesPendentes = {}
      this.salvandoAjustes = true
      try {
        const ajustes = Object.entries(lote).map(([k, quantidade]) => {
          const [codigo, tamanho] = k.split('|')
          return { codigo, tamanho, quantidade }
        })
        const { produtos } = await api('PATCH', 'estoque', { corpo: { ajustes } })
        for (const p of produtos) Object.assign(this.produtos.find((x) => x.codigo === p.codigo) || {}, p)
        this.avisar(this.armazenamento === 'github' ? 'Estoque salvo! A vitrine atualiza em cerca de 1 minuto.' : 'Estoque salvo!')
      } catch (e) {
        this.ajustesPendentes = { ...lote, ...this.ajustesPendentes }
        this.avisar(`Não foi possível salvar o estoque: ${e.message}`, 'erro')
        throw e
      } finally {
        this.salvandoAjustes = false
        if (this.temAjustesPendentes) this._temporizador = setTimeout(() => this.salvarAjustesAgora().catch(() => {}), ESPERA_AJUSTES_MS)
      }
    },

    async salvarConfig(campos) {
      this.config = (await api('PUT', 'config', { corpo: campos })).config
    },
  },
})
