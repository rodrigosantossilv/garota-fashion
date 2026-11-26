import { criarArmazenamentoLocal } from './local.js'
import { criarArmazenamentoGithub } from './github.js'

/** Escolhe o armazenamento pelas variáveis de ambiente. */
export function criarArmazenamento(env = process.env) {
  const tipo = env.ARMAZENAMENTO || (env.GITHUB_TOKEN ? 'github' : 'local')
  if (tipo === 'github') {
    return criarArmazenamentoGithub({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH || 'main' })
  }
  return criarArmazenamentoLocal(env.DADOS_RAIZ || process.cwd())
}
