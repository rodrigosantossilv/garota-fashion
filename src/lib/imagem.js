export const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
export const TAMANHO_MAXIMO_ORIGINAL = 10 * 1024 * 1024

/**
 * Reduz a foto no próprio celular antes de enviar (lado maior até 1200 px, WEBP).
 * Uma foto de 8 MB costuma virar ~200-500 KB. Devolve um data URL.
 */
export async function prepararImagem(arquivo) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) throw new Error('Formato não aceito. Envie uma foto JPG, PNG ou WEBP.')
  if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) throw new Error('A foto é grande demais (máximo de 10 MB).')

  const bitmap = await createImageBitmap(arquivo).catch(() => {
    throw new Error('Não foi possível abrir esta imagem. Tente outra foto.')
  })
  const escala = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  const gerar = (tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q))
  let blob = await gerar('image/webp', 0.82)
  if (!blob || blob.type !== 'image/webp') blob = await gerar('image/jpeg', 0.85) // navegadores sem WEBP
  for (let q = 0.7; blob.size > 1.8 * 1024 * 1024 && q > 0.3; q -= 0.15) blob = await gerar(blob.type, q)

  return await new Promise((ok) => {
    const r = new FileReader()
    r.onload = () => ok(r.result)
    r.readAsDataURL(blob)
  })
}

export function arquivoParaBase64(arquivo) {
  return new Promise((ok, erro) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1])
    r.onerror = () => erro(new Error('Não foi possível ler o arquivo.'))
    r.readAsDataURL(arquivo)
  })
}
