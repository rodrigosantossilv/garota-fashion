// Função única da Vercel: todas as rotas /api/* chegam aqui (ver vercel.json).
import { tratarNode } from '../lib/adaptador-node.js'

export default function handler(req, res) {
  return tratarNode(req, res)
}
