import { randomBytes } from 'node:crypto'
import { ErroHttp } from './erros.js'

export const TAMANHO_MAXIMO_IMAGEM = 2 * 1024 * 1024 // após a compressão no navegador

/** Identifica o tipo pelo conteúdo do arquivo (não confia na extensão). */
export function tipoImagem(buf) {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  return null
}

/** Recebe a imagem em base64 (com ou sem prefixo data:) e valida tipo e tamanho. */
export function decodificarImagem(base64) {
  if (typeof base64 !== 'string' || !base64) throw new ErroHttp(400, 'Imagem inválida.')
  const limpo = base64.replace(/^data:[^;]+;base64,/, '')
  const buf = Buffer.from(limpo, 'base64')
  if (buf.length === 0) throw new ErroHttp(400, 'Imagem inválida.')
  if (buf.length > TAMANHO_MAXIMO_IMAGEM) throw new ErroHttp(413, 'A imagem é grande demais (máximo de 2 MB após a compressão).')
  const ext = tipoImagem(buf)
  if (!ext) throw new ErroHttp(415, 'Formato de imagem não aceito. Envie JPG, PNG ou WEBP.')
  return { buf, ext }
}

export function nomeImagem(codigo, ext) {
  return `${codigo}-${randomBytes(3).toString('hex')}.${ext}`
}

export const NOME_IMAGEM_REGEX = /^GF-\d{4,}-[a-f0-9]{6}\.(webp|jpg|png)$/
