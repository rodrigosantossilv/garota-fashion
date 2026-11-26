import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { tratarNode } from './lib/adaptador-node.js'
import { catalogoPublico } from './lib/catalogo.js'
import { carregar } from './lib/dados.js'
import { dadosEstruturados } from './lib/dados-estruturados.js'
import { criarArmazenamentoLocal } from './lib/armazenamento/local.js'
import { carregarEnv } from './scripts/env.js'

const lerDadosLocais = async () =>
  (await carregar(criarArmazenamentoLocal(), ['produtos', 'categorias', 'config'])).dados

/**
 * Em desenvolvimento (npm run dev / npm run preview):
 *  - /api/*        -> mesma API que roda na Vercel
 *  - /catalogo.json -> gerado na hora a partir de dados/ (em produção é gerado no build)
 * No build: injeta os dados estruturados (JSON-LD) no index.html.
 */
function garotaFashion() {
  const middleware = async (req, res, next) => {
    try {
      if (req.url.startsWith('/api/')) return await tratarNode(req, res)
      if (req.url.split('?')[0] === '/catalogo.json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        return res.end(JSON.stringify(catalogoPublico(await lerDadosLocais())))
      }
    } catch (e) {
      return next(e)
    }
    next()
  }
  return {
    name: 'garota-fashion',
    configureServer(server) {
      carregarEnv()
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      carregarEnv()
      server.middlewares.use(middleware)
    },
    async transformIndexHtml(html) {
      return html.replace('<!-- DADOS-ESTRUTURADOS -->', dadosEstruturados(await lerDadosLocais(), { url: process.env.SITE_URL }))
    },
  }
}

export default defineConfig({
  plugins: [vue(), garotaFashion()],
  server: { watch: { ignored: ['**/dados/**'] } },
})
