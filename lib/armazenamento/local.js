import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Armazenamento em arquivos locais (desenvolvimento e testes).
 * As gravações são serializadas por uma fila simples dentro do processo.
 */
export function criarArmazenamentoLocal(raiz = process.cwd()) {
  let fila = Promise.resolve()

  const resolver = (caminho) => {
    const completo = path.resolve(raiz, caminho)
    if (!completo.startsWith(path.resolve(raiz) + path.sep)) throw new Error('Caminho inválido')
    return completo
  }

  return {
    tipo: 'local',
    async versaoAtual() {
      return 'local'
    },
    async lerArquivo(caminho) {
      try {
        return await fs.readFile(resolver(caminho))
      } catch (e) {
        if (e.code === 'ENOENT') return null
        throw e
      }
    },
    async gravar({ arquivos }) {
      const tarefa = fila.then(async () => {
        for (const arq of arquivos) {
          const destino = resolver(arq.caminho)
          if (arq.remover) {
            await fs.rm(destino, { force: true })
          } else {
            await fs.mkdir(path.dirname(destino), { recursive: true })
            await fs.writeFile(destino, arq.conteudo)
          }
        }
      })
      fila = tarefa.catch(() => {})
      return tarefa
    },
  }
}
