// Cria o primeiro administrador (ou redefine a senha de um existente).
// Uso: npm run criar-admin
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { salvarAdministrador } from '../lib/rotas/auth.js'
import { criarArmazenamento } from '../lib/armazenamento/index.js'
import { carregarEnv } from './env.js'

carregarEnv()

const saida = new Writable({
  write(chunk, enc, cb) {
    if (!saida.mudo) process.stdout.write(chunk, enc)
    cb()
  },
})
const rl = readline.createInterface({ input: process.stdin, output: saida, terminal: true })
const perguntar = (texto, oculto = false) =>
  new Promise((resolve) => {
    process.stdout.write(texto)
    saida.mudo = oculto
    rl.question('', (r) => {
      saida.mudo = false
      if (oculto) process.stdout.write('\n')
      resolve(r)
    })
  })

try {
  const arm = criarArmazenamento()
  console.log(`\nCriar administrador do painel (gravando em: ${arm.tipo === 'github' ? 'GitHub' : 'arquivos locais'})\n`)
  const email = await perguntar('E-mail: ')
  const nome = await perguntar('Nome: ')
  const senha = await perguntar('Senha (mínimo 8 caracteres): ', true)
  const confirmacao = await perguntar('Repita a senha: ', true)
  if (senha !== confirmacao) throw new Error('As senhas não conferem.')
  const { criado } = await salvarAdministrador(arm, { email, nome, senha })
  console.log(criado ? '\n✔ Administrador criado.' : '\n✔ Senha do administrador redefinida.')
  if (arm.tipo === 'local') {
    console.log('  Para valer no site publicado, faça commit e push do arquivo dados/admin.json.')
  }
} catch (e) {
  console.error(`\n✖ ${e.message}`)
  process.exitCode = 1
} finally {
  rl.close()
}
