<script setup>
import { reactive, ref } from 'vue'
import { usePainel } from '../../stores/painel.js'
import { formatarTelefone } from '../../lib/formato.js'

const store = usePainel()

const senha = reactive({ atual: '', nova: '', repetir: '' })
const erroSenha = ref('')
const salvandoSenha = ref(false)
async function trocarSenha() {
  erroSenha.value = ''
  if (senha.nova !== senha.repetir) return (erroSenha.value = 'A nova senha e a confirmação não conferem.')
  salvandoSenha.value = true
  try {
    await store.trocarSenha(senha.atual, senha.nova)
    Object.assign(senha, { atual: '', nova: '', repetir: '' })
    store.avisar('Senha alterada. Outros aparelhos conectados precisarão entrar de novo.')
  } catch (e) {
    erroSenha.value = e.message
  } finally {
    salvandoSenha.value = false
  }
}

const cfg = reactive({
  limiteEstoqueBaixo: store.config.limiteEstoqueBaixo,
  whatsapp: formatarTelefone(store.config.whatsapp),
  instagram: store.config.instagram ? `@${store.config.instagram}` : '',
})
const erroCfg = ref('')
const salvandoCfg = ref(false)
async function salvarConfig() {
  erroCfg.value = ''
  salvandoCfg.value = true
  try {
    const digitos = cfg.whatsapp.replace(/\D/g, '')
    await store.salvarConfig({
      limiteEstoqueBaixo: cfg.limiteEstoqueBaixo,
      whatsapp: digitos && !digitos.startsWith('55') ? `55${digitos}` : digitos,
      instagram: cfg.instagram,
    })
    store.avisar(store.avisoPublicacao)
  } catch (e) {
    erroCfg.value = e.message
  } finally {
    salvandoCfg.value = false
  }
}
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo"><div><h1>Minha conta</h1><p>{{ store.usuario?.nome }} · {{ store.usuario?.email }}</p></div></div>

    <div class="duas">
      <form class="p-cartao bloco" @submit.prevent="salvarConfig">
        <h2>Dados da loja</h2>
        <label class="p-campo">
          <span>WhatsApp da loja</span>
          <input id="cfg-whatsapp" v-model="cfg.whatsapp" class="p-input" inputmode="tel" placeholder="(75) 99999-0000" />
          <small>Recebe os pedidos do botão “Quero essa” e aparece no site.</small>
        </label>
        <label class="p-campo">
          <span>Instagram</span>
          <input id="cfg-instagram" v-model="cfg.instagram" class="p-input" placeholder="@fashiongarotta" />
        </label>
        <label class="p-campo">
          <span>Alerta de estoque baixo</span>
          <input id="cfg-limite" v-model.number="cfg.limiteEstoqueBaixo" class="p-input num" type="number" min="0" max="1000" />
          <small>Produtos com esta quantidade total ou menos aparecem como “Estoque baixo”.</small>
        </label>
        <p v-if="erroCfg" class="p-erro">{{ erroCfg }}</p>
        <button class="btn" :disabled="salvandoCfg">{{ salvandoCfg ? 'Salvando…' : 'Salvar dados' }}</button>
      </form>

      <form class="p-cartao bloco" @submit.prevent="trocarSenha">
        <h2>Trocar senha</h2>
        <input type="text" autocomplete="username" :value="store.usuario?.email" class="sr-only" tabindex="-1" aria-hidden="true" readonly />
        <label class="p-campo"><span>Senha atual</span>
          <input id="senha-atual" v-model="senha.atual" class="p-input" type="password" autocomplete="current-password" required />
        </label>
        <label class="p-campo"><span>Nova senha</span>
          <input id="senha-nova" v-model="senha.nova" class="p-input" type="password" autocomplete="new-password" minlength="8" required />
          <small>Mínimo de 8 caracteres.</small>
        </label>
        <label class="p-campo"><span>Repita a nova senha</span>
          <input id="senha-repetir" v-model="senha.repetir" class="p-input" type="password" autocomplete="new-password" minlength="8" required />
        </label>
        <p v-if="erroSenha" class="p-erro">{{ erroSenha }}</p>
        <button class="btn" :disabled="salvandoSenha">{{ salvandoSenha ? 'Alterando…' : 'Alterar senha' }}</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.duas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
@media (max-width: 760px) { .duas { grid-template-columns: minmax(0, 1fr); } }
.bloco { display: flex; flex-direction: column; gap: 14px; }
.bloco h2 { margin: 0; }
.bloco .btn { align-self: flex-start; }
</style>
