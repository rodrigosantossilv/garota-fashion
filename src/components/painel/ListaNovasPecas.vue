<script setup>
// Peças que entraram pela planilha (ou sem foto) e ainda não estão na loja.
import { ref } from 'vue'
import Icone from '../Icone.vue'
import { usePainel } from '../../stores/painel.js'
import { formatarPreco, imagemPainel } from '../../lib/formato.js'
import { prepararImagem } from '../../lib/imagem.js'

defineProps({ pecas: { type: Array, required: true } })
const store = usePainel()
const enviando = ref({})

async function escolherFoto(p, e) {
  const arquivo = e.target.files?.[0]
  e.target.value = ''
  if (!arquivo) return
  enviando.value[p.codigo] = true
  try {
    await store.enviarImagem(p.codigo, await prepararImagem(arquivo))
    store.avisar(`Foto adicionada em "${p.nome}". Agora clique em "Adicionar à loja".`)
  } catch (err) {
    store.avisar(err.message, 'erro')
  } finally {
    enviando.value[p.codigo] = false
  }
}
</script>

<template>
  <ul class="novas">
    <li v-for="p in pecas" :key="p.codigo" class="peca">
      <img v-if="p.imagem" :src="imagemPainel(p.imagem)" alt="" class="foto" />
      <span v-else class="foto sem"><Icone nome="camera" /><small>Sem foto</small></span>

      <div class="dados">
        <strong>{{ p.nome }}<template v-if="p.cor"> · {{ p.cor }}</template></strong>
        <small>{{ p.codigo }} · {{ formatarPreco(p.preco) }}</small>
        <small class="tams">{{ p.tamanhos.map((t) => `${t.tamanho}: ${t.quantidade}`).join(' · ') }}</small>
      </div>

      <div class="botoes">
        <label class="btn btn-claro btn-pequeno" :class="{ ocupado: enviando[p.codigo] }">
          <input :id="`foto-${p.codigo}`" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="escolherFoto(p, $event)" />
          <Icone nome="camera" /> {{ enviando[p.codigo] ? 'Enviando…' : p.imagem ? 'Trocar imagem' : 'Adicionar imagem' }}
        </label>
        <RouterLink v-if="p.imagem" :to="{ name: 'produto-editar', params: { codigo: p.codigo }, query: { publicar: '1' } }" class="btn btn-pequeno">
          <Icone nome="check" /> Adicionar à loja
        </RouterLink>
        <span v-else class="btn btn-pequeno bloqueado" aria-disabled="true" title="Adicione uma foto para liberar">
          <svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          Adicionar à loja
        </span>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.novas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.peca { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; background: var(--branco); border: 1.5px dashed var(--rosa); border-radius: var(--raio); padding: 10px 12px; }
.foto { width: 56px; height: 70px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.foto.sem { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: var(--rosa-claro); color: var(--rosa); }
.foto.sem small { font-size: 9px; font-weight: 700; }
.dados { display: flex; flex-direction: column; gap: 2px; flex: 1 1 180px; min-width: 0; }
.dados strong { font-size: 15px; }
.dados small { color: var(--texto-suave); font-size: 12px; }
.tams { font-variant-numeric: tabular-nums; }
.botoes { display: flex; gap: 8px; flex-wrap: wrap; }
.botoes label { cursor: pointer; }
.ocupado { opacity: .6; pointer-events: none; }
.bloqueado { background: #eee3e9; border-color: #eee3e9; color: #a98a99; cursor: not-allowed; }
.bloqueado:hover { background: #eee3e9; border-color: #eee3e9; }
@media (max-width: 520px) { .botoes { width: 100%; } .botoes > * { flex: 1; } }
</style>
