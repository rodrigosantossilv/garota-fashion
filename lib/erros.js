/** Erro com status HTTP e mensagem em português, pronta para mostrar ao usuário. */
export class ErroHttp extends Error {
  constructor(status, mensagem, extras = {}) {
    super(mensagem)
    this.status = status
    this.extras = extras
  }
}

/** Os dados mudaram entre a leitura e a gravação (outra edição ao mesmo tempo). */
export class ErroConflito extends Error {
  constructor() {
    super('Conflito de versão')
  }
}
