<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePainel } from '../../stores/painel.js'
import '../../estilos/painel.css'

const store = usePainel()
const route = useRoute()
const router = useRouter()
const email = ref('')
const senha = ref('')
const erro = ref(route.query.expirou ? 'Sua sessão expirou. Entre novamente.' : '')
const entrando = ref(false)

async function entrar() {
  erro.value = ''
  entrando.value = true
  try {
    await store.entrar(email.value, senha.value)
    const volta = typeof route.query.volta === 'string' && route.query.volta.startsWith('/painel') ? route.query.volta : '/painel'
    router.replace(volta)
  } catch (e) {
    erro.value = e.message
    senha.value = ''
  } finally {
    entrando.value = false
  }
}
</script>

<template>
  <main class="tela">
    <form class="cartao p-cartao" @submit.prevent="entrar">
      <div class="logo"><span class="marca">Garota</span><span class="marca-sub">FASHION</span></div>
      <h1>Painel da loja</h1>
      <label class="p-campo">
        <span>E-mail</span>
        <input id="login-email" v-model="email" class="p-input" type="email" autocomplete="username" required />
      </label>
      <label class="p-campo">
        <span>Senha</span>
        <input id="login-senha" v-model="senha" class="p-input" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="erro" class="p-erro" role="alert">{{ erro }}</p>
      <button class="btn" :disabled="entrando">{{ entrando ? 'Entrando…' : 'Entrar' }}</button>
      <p class="ajuda">Esqueceu a senha? Peça para quem cuida do site redefinir com <code>npm run criar-admin</code>.</p>
    </form>
  </main>
</template>

<style scoped>
.tela { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px var(--gutter-d) 24px var(--gutter-e); background: linear-gradient(180deg, var(--fundo-topo), var(--fundo-meio) 60%, var(--lilas)); }
.cartao { width: min(380px, 100%); display: flex; flex-direction: column; gap: 14px; box-shadow: var(--sombra); padding: 28px 22px; }
.logo { display: flex; flex-direction: column; align-items: center; }
.logo .marca { font-size: 44px; }
.logo .marca-sub { font-size: 11px; margin: 4px 0 0 .5em; }
h1 { margin: 4px 0 6px; text-align: center; font-size: 15px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--texto-suave); }
.ajuda { margin: 0; font-size: 12px; color: var(--texto-suave); text-align: center; line-height: 1.5; }
code { font-size: 11px; background: var(--rosa-claro); padding: 1px 5px; border-radius: 4px; }
</style>
