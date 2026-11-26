<script setup>
import { nextTick, ref, watch } from 'vue'
import Icone from '../Icone.vue'
import { useDialogo } from '../../stores/dialogo.js'

const dialogo = useDialogo()
const botaoOk = ref(null)
watch(() => dialogo.aberto, (d) => d && nextTick(() => botaoOk.value?.focus()))
</script>

<template>
  <Transition name="pop">
    <div v-if="dialogo.aberto" class="fundo" @click.self="dialogo.responder(false)" @keydown.esc="dialogo.responder(false)">
      <div class="caixa" :class="dialogo.aberto.tom" role="alertdialog" aria-modal="true" aria-labelledby="dlg-titulo" aria-describedby="dlg-msg">
        <div class="selo"><Icone :nome="dialogo.aberto.tom === 'perigo' ? 'lixo' : 'alerta'" /></div>
        <h2 id="dlg-titulo">{{ dialogo.aberto.titulo }}</h2>
        <p id="dlg-msg">{{ dialogo.aberto.mensagem }}</p>
        <div class="acoes">
          <button type="button" class="btn btn-claro" @click="dialogo.responder(false)">{{ dialogo.aberto.cancelar }}</button>
          <button ref="botaoOk" type="button" class="btn" :class="{ 'btn-vermelho': dialogo.aberto.tom === 'perigo' }" @click="dialogo.responder(true)">
            {{ dialogo.aberto.ok }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fundo {
  position: fixed; inset: 0; z-index: 120; display: grid; place-items: center;
  padding: 16px max(16px, env(safe-area-inset-right, 0px)) 16px max(16px, env(safe-area-inset-left, 0px));
  background: rgba(74, 21, 48, .45); backdrop-filter: blur(3px);
}
.caixa {
  width: min(420px, 100%); text-align: center; border-radius: 20px; padding: 28px 22px 22px;
  background: linear-gradient(180deg, var(--branco) 0%, var(--fundo-topo) 55%, var(--fundo-meio) 100%);
  border: 2px solid var(--rosa); box-shadow: 6px 6px 0 rgba(201,36,95,.25), 0 20px 50px rgba(74,21,48,.3);
}
.selo { width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; background: var(--rosa); color: var(--branco); }
.perigo .selo { background: var(--vermelho); }
.selo .icone { width: 28px; height: 28px; }
h2 { margin: 0 0 8px; font-family: var(--fonte-marca); font-weight: 400; font-size: 30px; color: var(--rosa); }
p { margin: 0 0 20px; line-height: 1.55; color: var(--texto); font-size: 15px; }
.acoes { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.acoes .btn { flex: 1 1 140px; }
.btn-vermelho { background: var(--vermelho); border-color: var(--vermelho); }
.btn-vermelho:hover { background: #9b2424; border-color: #9b2424; }
.pop-enter-active, .pop-leave-active { transition: opacity .2s; }
.pop-enter-active .caixa, .pop-leave-active .caixa { transition: transform .25s cubic-bezier(.2,.9,.3,1.2); }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .caixa, .pop-leave-to .caixa { transform: scale(.9); }
</style>
