import { ErroHttp } from './erros.js'

const invalido = (mensagem) => new ErroHttp(400, mensagem)

export function texto(valor, campo, { min = 1, max = 120 } = {}) {
  const t = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : ''
  if (t.length < min) throw invalido(`Informe ${campo}.`)
  if (t.length > max) throw invalido(`${campo[0].toUpperCase() + campo.slice(1)} deve ter no máximo ${max} caracteres.`)
  return t
}

export function email(valor) {
  const e = typeof valor === 'string' ? valor.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 160) throw invalido('Informe um e-mail válido.')
  return e
}

/** Aceita 59.9, "59,90", "R$ 1.299,90". Devolve número com 2 casas ou null. */
export function interpretarPreco(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null
  if (typeof valor !== 'string') return null
  let s = valor.replace(/R\$/gi, '').replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Math.round(Number(s) * 100) / 100
}

export function preco(valor) {
  const p = interpretarPreco(valor)
  if (p === null || p <= 0) throw invalido('Informe um preço válido, maior que zero.')
  if (p > 99999.99) throw invalido('O preço deve ser no máximo R$ 99.999,99.')
  return p
}

/** Inteiro >= 0. Devolve null se inválido. */
export function interpretarQuantidade(valor) {
  const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor.trim()) : valor
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 99999) return null
  return n
}

export function quantidade(valor, rotulo = 'A quantidade') {
  const n = interpretarQuantidade(valor)
  if (n === null) throw invalido(`${rotulo} deve ser um número inteiro entre 0 e 99999.`)
  return n
}

/** Cor é opcional: devolve '' quando não informada. */
export function cor(valor) {
  const t = typeof valor === 'string' || typeof valor === 'number' ? String(valor).trim().replace(/\s+/g, ' ') : ''
  if (t.length > 30) throw invalido('A cor deve ter no máximo 30 caracteres.')
  return t
}

/** Compara textos sem diferenciar maiúsculas, acentos e espaços extras. */
export const normalizarTexto = (t) =>
  String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()

export function normalizarTamanho(valor) {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor).trim().toUpperCase() : ''
}

export function tamanhos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) throw invalido('Cadastre pelo menos um tamanho (use "ÚNICO" se a peça tiver tamanho único).')
  if (lista.length > 20) throw invalido('Cadastre no máximo 20 tamanhos por produto.')
  const vistos = new Set()
  return lista.map((t) => {
    const nome = normalizarTamanho(t?.tamanho)
    if (!nome || nome.length > 10) throw invalido('Cada tamanho precisa de um nome com até 10 caracteres (ex.: P, M, 38).')
    if (vistos.has(nome)) throw invalido(`O tamanho "${nome}" foi informado duas vezes.`)
    vistos.add(nome)
    return { tamanho: nome, quantidade: quantidade(t.quantidade, `A quantidade do tamanho ${nome}`) }
  })
}

export function slug(valor) {
  return String(valor)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export const CODIGO_REGEX = /^GF-\d{4,}$/

export function codigo(valor) {
  if (typeof valor !== 'string' || !CODIGO_REGEX.test(valor)) throw invalido('Código de produto inválido.')
  return valor
}
