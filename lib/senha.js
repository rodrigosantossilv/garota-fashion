import bcrypt from 'bcryptjs'
import { custoBcrypt } from './config.js'

export const SENHA_MINIMA = 8

// Hash usado quando o e-mail não existe, para o tempo de resposta ser igual.
let hashFalso = null

export function validarNovaSenha(senha) {
  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA) {
    return `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`
  }
  if (senha.length > 72) return 'A senha deve ter no máximo 72 caracteres.'
  return null
}

export async function gerarHash(senha) {
  return bcrypt.hash(senha, custoBcrypt())
}

export async function conferirSenha(senha, hash) {
  if (typeof senha !== 'string') return false
  if (!hash) {
    hashFalso ??= await bcrypt.hash('senha-que-nunca-confere', custoBcrypt())
    await bcrypt.compare(senha, hashFalso)
    return false
  }
  return bcrypt.compare(senha, hash)
}
