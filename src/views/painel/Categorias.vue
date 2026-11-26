<script setup>
import { reactive, ref } from 'vue'
import Icone from '../../components/Icone.vue'
import { usePainel } from '../../stores/painel.js'
import { useDialogo } from '../../stores/dialogo.js'

const store = usePainel()
const dialogo = useDialogo()
const nova = ref('')
const erro = ref('')
const editando = reactive({ slug: null, nome: '' })
const removendo = reactive({ slug: null, total: 0, destino: '' })

const contar = (slug) => store.produtos.filter((p) => p.categoria === slug).length
const falhar = (e) => store.avisar(e.message, 'erro')

async function criar() {
  erro.value = ''
  try {
    const c = await store.criarCategoria(nova.value)
    nova.value = ''
    store.avisar(`Categoria "${c.nome}" criada.`)
  } catch (e) {
    erro.value = e.message
  }
}

async function renomear(c) {
  try {
    await store.editarCategoria(c.slug, { nome: editando.nome })
    editando.slug = null
    store.avisar('Categoria renomeada.')
  } catch (e) {
    falhar(e)
  }
}

async function mover(i, direcao) {
  const a = store.categorias[i]
  const b = store.categorias[i + direcao]
  if (!b) return
  try {
    const [oa, ob] = [a.ordem, b.ordem]
    await store.editarCategoria(a.slug, { ordem: ob })
    await store.editarCategoria(b.slug, { ordem: oa })
  } catch (e) {
    falhar(e)
  }
}

async function remover(c) {
  const total = contar(c.slug)
  if (total > 0) {
    // Não remove direto: oferece mover os produtos para outra categoria.
    Object.assign(removendo, { slug: c.slug, total, destino: store.categorias.find((x) => x.slug !== c.slug)?.slug || '__sem__' })
    return
  }
  const ok = await dialogo.confirmar({
    titulo: 'Remover categoria?',
    mensagem: `A categoria "${c.nome}" será removida da loja.`,
    ok: 'Remover',
    cancelar: 'Cancelar',
    tom: 'perigo',
  })
  if (!ok) return
  try {
    await store.removerCategoria(c.slug)
    store.avisar('Categoria removida.')
  } catch (e) {
    falhar(e)
  }
}

async function moverERemover(c) {
  try {
    const semCategoria = removendo.destino === '__sem__'
    await store.removerCategoria(c.slug, semCategoria ? null : removendo.destino)
    store.avisar(semCategoria ? `Categoria removida. ${removendo.total} produto(s) ficaram sem categoria.` : `${removendo.total} produto(s) movido(s) e categoria removida.`)
    removendo.slug = null
  } catch (e) {
    falhar(e)
  }
}
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo"><div><h1>Categorias</h1><p>A ordem aqui é a ordem em que aparecem na loja.</p></div></div>

    <form class="p-cartao nova" @submit.prevent="criar">
      <label class="p-campo">
        <span>Nova categoria</span>
        <input id="categoria-nova" v-model="nova" class="p-input" maxlength="40" placeholder="Ex.: Blusas, Vestidos, Conjuntos" required />
      </label>
      <button class="btn"><Icone nome="mais" /> Criar</button>
      <p v-if="erro" class="p-erro">{{ erro }}</p>
    </form>

    <div v-if="!store.categorias.length" class="p-cartao p-vazio"><strong>Nenhuma categoria ainda</strong>Crie a primeira acima.</div>

    <ul v-else class="lista">
      <li v-for="(c, i) in store.categorias" :key="c.slug" class="p-cartao item">
        <div class="ordem">
          <button type="button" :disabled="i === 0" :aria-label="`Subir ${c.nome}`" @click="mover(i, -1)"><Icone nome="cima" /></button>
          <button type="button" :disabled="i === store.categorias.length - 1" :aria-label="`Descer ${c.nome}`" @click="mover(i, 1)"><Icone nome="baixo" /></button>
        </div>

        <form v-if="editando.slug === c.slug" class="editar" @submit.prevent="renomear(c)">
          <input :id="`renomear-${c.slug}`" v-model="editando.nome" class="p-input" maxlength="40" required />
          <button class="btn btn-pequeno">Salvar</button>
          <button type="button" class="btn btn-claro btn-pequeno" @click="editando.slug = null">Cancelar</button>
        </form>
        <div v-else class="nome">
          <strong>{{ c.nome }}</strong>
          <small>{{ contar(c.slug) }} produto(s) · /catalogo/{{ c.slug }}</small>
        </div>

        <div v-if="editando.slug !== c.slug" class="acoes">
          <button type="button" class="btn btn-claro btn-pequeno" @click="Object.assign(editando, { slug: c.slug, nome: c.nome })"><Icone nome="lapis" /> Renomear</button>
          <button type="button" class="btn btn-perigo btn-pequeno" @click="remover(c)"><Icone nome="lixo" /> Remover</button>
        </div>

        <div v-if="removendo.slug === c.slug" class="aviso-remover" role="alert">
          <p><Icone nome="alerta" /> <strong>"{{ c.nome }}" tem {{ removendo.total }} produto(s).</strong> Para remover, escolha para onde eles vão.</p>
          <div class="linha">
            <label class="sr-only" :for="`destino-${c.slug}`">Mover produtos para</label>
            <select :id="`destino-${c.slug}`" v-model="removendo.destino" class="p-input">
              <option v-for="d in store.categorias.filter((x) => x.slug !== c.slug)" :key="d.slug" :value="d.slug">Mover para: {{ d.nome }}</option>
              <option value="__sem__">Deixar sem categoria</option>
            </select>
            <button type="button" class="btn btn-perigo btn-pequeno" @click="moverERemover(c)">Remover categoria</button>
            <button type="button" class="btn btn-claro btn-pequeno" @click="removendo.slug = null">Cancelar</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.nova { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; }
.nova .p-campo { flex: 1 1 240px; }
.nova .p-erro { flex-basis: 100%; }
.lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 14px; }
.ordem { display: flex; flex-direction: column; }
.ordem button { border: 0; background: none; color: var(--rosa); cursor: pointer; width: 28px; height: 22px; display: grid; place-items: center; border-radius: 6px; }
.ordem button:hover:not(:disabled) { background: var(--rosa-claro); }
.ordem button:disabled { color: #e2cfd8; cursor: default; }
.nome { display: flex; flex-direction: column; gap: 2px; flex: 1 1 160px; min-width: 0; }
.nome small { color: var(--texto-suave); font-size: 12px; }
.editar { display: flex; gap: 8px; flex: 1 1 260px; flex-wrap: wrap; }
.editar .p-input { flex: 1 1 160px; }
.acoes { display: flex; gap: 8px; }
.aviso-remover { flex-basis: 100%; background: #fff8ec; border: 1px solid #f5dfb5; border-radius: 10px; padding: 12px; }
.aviso-remover p { margin: 0 0 10px; display: flex; gap: 6px; align-items: flex-start; font-size: 14px; flex-wrap: wrap; }
.aviso-remover .linha { display: flex; gap: 8px; flex-wrap: wrap; }
.aviso-remover select { flex: 1 1 200px; }
</style>
