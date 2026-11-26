// Gera public/catalogo.json (SEM quantidades) a partir de dados/. Roda antes do build.
import { promises as fs } from 'node:fs'
import { catalogoPublico } from '../lib/catalogo.js'
import { carregar } from '../lib/dados.js'
import { criarArmazenamentoLocal } from '../lib/armazenamento/local.js'

const { dados } = await carregar(criarArmazenamentoLocal(), ['produtos', 'categorias', 'config'])
const catalogo = catalogoPublico(dados)
await fs.writeFile('public/catalogo.json', JSON.stringify(catalogo))
console.log(`catalogo.json gerado: ${catalogo.produtos.length} produto(s), ${catalogo.categorias.length} categoria(s).`)
