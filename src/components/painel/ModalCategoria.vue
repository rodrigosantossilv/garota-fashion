<script setup>
// Cria uma categoria sem sair da tela atual (ex.: no meio do cadastro de produto).
import { nextTick, onMounted, ref } from 'vue'
import { usePainel } from '../../stores/painel.js'

const emit = defineEmits(['criada', 'fechar'])
const store = usePainel()
const nome = ref('')
const erro = ref('')
const salvando = ref(false)
const campo = ref(null)
onMounted(() => nextTick(() => campo.value?.focus()))

async function salvar() {
  erro.value = ''
  salvando.value = true
  try {
    const c = await store.criarCategoria(nome.value)
    store.avisar(`Categoria "${c.nome}" criada.`)
    emit('criada', c)
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <div class="fundo" @click.self="emit('fechar')" @keydown.esc="emit('fechar')">
    <form class="modal p-cartao" role="dialog" aria-modal="true" aria-labelledby="t-nova-cat" @submit.prevent="salvar">
      <h2 id="t-nova-cat">Nova categoria</h2>
      <label class="p-campo">
        <span>Nome</span>
        <input id="nova-categoria-nome" ref="campo" v-model="nome" class="p-input" maxlength="40" placeholder="Ex.: Blusas" required />
      </label>
      <p v-if="erro" class="p-erro">{{ erro }}</p>
      <div class="acoes">
        <button type="button" class="btn btn-claro" @click="emit('fechar')">Cancelar</button>
        <button class="btn" :disabled="salvando">{{ salvando ? 'Criando…' : 'Criar categoria' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fundo { position: fixed; inset: 0; z-index: 90; background: rgba(74,21,48,.35); display: grid; place-items: center; padding: 16px; }
.modal { width: min(400px, 100%); display: flex; flex-direction: column; gap: 14px; }
.modal h2 { margin: 0; }
.acoes { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
</style>
