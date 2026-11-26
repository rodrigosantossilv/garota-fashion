/** Chamadas à API do painel. Erros viram Error com a mensagem em português vinda do servidor. */
export class ErroApi extends Error {
  constructor(mensagem, status, dados) {
    super(mensagem)
    this.status = status
    this.dados = dados
  }
}

let aoExpirar = () => {}
export const quandoSessaoExpirar = (fn) => (aoExpirar = fn)

export async function api(metodo, rota, { corpo, query, binario = false } = {}) {
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v != null))}` : ''
  let resp
  try {
    resp = await fetch(`/api/${rota}${qs}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: { 'X-Garota-Painel': '1', ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Verifique sua internet e tente novamente.', 0)
  }
  if (resp.ok && binario) return resp.blob()
  const dados = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    if (resp.status === 401 && !rota.startsWith('auth/')) aoExpirar()
    throw new ErroApi(dados.erro || `Erro ${resp.status}. Tente novamente.`, resp.status, dados)
  }
  return dados
}
