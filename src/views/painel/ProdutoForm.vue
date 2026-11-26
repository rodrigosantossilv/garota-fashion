<script setup>
import { computed, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import Icone from '../../components/Icone.vue'
import ModalCategoria from '../../components/painel/ModalCategoria.vue'
import { usePainel } from '../../stores/painel.js'
import { useDialogo } from '../../stores/dialogo.js'
import { imagemPainel } from '../../lib/formato.js'
import { prepararImagem } from '../../lib/imagem.js'

const props = defineProps({ codigo: { type: String, default: null } })
const store = usePainel()
const dialogo = useDialogo()
const router = useRouter()
const existente = computed(() => (props.codigo ? store.produtos.find((p) => p.codigo === props.codigo) : null))
const naoEncontrado = computed(() => props.codigo && !existente.value)
// Peça que ainda não está na loja: o formulário vira "Adicionar à loja".
const modoPublicar = computed(() => Boolean(existente.value?.rascunho))
const campoCategoria = ref(null)

const PRESETS = ['PP', 'P', 'M', 'G', 'GG', 'ÚNICO', '36', '38', '40', '42', '44']

const f = reactive({
  nome: existente.value?.nome || '',
  cor: existente.value?.cor || '',
  preco: existente.value ? existente.value.preco.toFixed(2).replace('.', ',') : '',
  categoria: existente.value?.categoria || '',
  ativo: existente.value?.ativo !== false,
  tamanhos: existente.value ? existente.value.tamanhos.map((t) => ({ ...t })) : [],
})
const imagemNova = ref(null) // data URL comprimido
const removerImagem = ref(false)
const tamanhoOutro = ref('')
const erro = ref('')
const salvando = ref(false)
const preparandoFoto = ref(false)
const modalCategoria = ref(false)
let salvo = false

const previa = computed(() => imagemNova.value || (!removerImagem.value && imagemPainel(existente.value?.imagem)))

function adicionarTamanho(nome) {
  const t = String(nome || '').trim().toUpperCase()
  if (!t) return
  if (f.tamanhos.some((x) => x.tamanho === t)) return store.avisar(`O tamanho ${t} já está na lista.`, 'erro')
  f.tamanhos.push({ tamanho: t, quantidade: 0 })
  tamanhoOutro.value = ''
}

async function escolherFoto(e) {
  const arquivo = e.target.files?.[0]
  e.target.value = ''
  if (!arquivo) return
  erro.value = ''
  preparandoFoto.value = true
  try {
    imagemNova.value = await prepararImagem(arquivo)
    removerImagem.value = false
  } catch (err) {
    erro.value = err.message
  } finally {
    preparandoFoto.value = false
  }
}

function tirarFoto() {
  imagemNova.value = null
  removerImagem.value = true
}

function categoriaCriada(c) {
  f.categoria = c.slug // já fica selecionada, sem recarregar
  modalCategoria.value = false
}

const temFoto = computed(() => Boolean(previa.value))
const sufixoPublicacao = () => (store.armazenamento === 'github' ? ' A vitrine atualiza em cerca de 1 minuto.' : '')

/** publicar: true = "Publicar na loja"; false = "Salvar sem publicar" (só no modo publicar). */
async function salvar(publicar = true) {
  erro.value = ''
  const publicando = modoPublicar.value // guardado antes: depois de salvar a peça deixa de ser rascunho
  const vaiParaLoja = publicando ? publicar : f.ativo && temFoto.value
  if (vaiParaLoja && !f.categoria) {
    const continuar = await dialogo.confirmar({
      titulo: 'Produto sem categoria',
      mensagem: 'Este produto será cadastrado sem categoria. Ele aparece na loja em “Todas”, mas não em nenhuma categoria. Deseja continuar?',
      ok: 'Continuar sem categoria',
      cancelar: 'Escolher categoria',
    })
    if (!continuar) return campoCategoria.value?.focus()
  }
  salvando.value = true
  try {
    const campos = { nome: f.nome, cor: f.cor, preco: f.preco, categoria: f.categoria || null, ativo: f.ativo, tamanhos: f.tamanhos }
    if (imagemNova.value) campos.imagem = imagemNova.value
    else if (removerImagem.value) campos.imagem = null
    if (publicando && publicar) campos.publicar = true
    const p = await store.salvarProduto(props.codigo, campos)
    salvo = true
    if (p.rascunho) {
      store.avisar(`${p.codigo} salvo em Novas peças. Adicione a foto e clique em “Adicionar à loja” para publicar.`)
      router.push({ name: 'novas' })
    } else {
      store.avisar(`${publicando ? `"${p.nome}" está na loja!` : props.codigo ? 'Alterações salvas.' : `Produto ${p.codigo} cadastrado.`}${sufixoPublicacao()}`)
      router.push({ name: publicando && store.novasPecas.length ? 'novas' : 'produtos' })
    }
  } catch (e) {
    erro.value = e.message
  } finally {
    salvando.value = false
  }
}

async function excluir() {
  const ok = await dialogo.confirmar({
    titulo: 'Excluir peça?',
    mensagem: `"${existente.value.nome}" será excluída da loja e do painel. Esta ação não pode ser desfeita.`,
    ok: 'Excluir',
    cancelar: 'Cancelar',
    tom: 'perigo',
  })
  if (!ok) return
  try {
    await store.removerProduto(props.codigo)
    salvo = true
    store.avisar('Produto excluído.')
    router.push({ name: 'produtos' })
  } catch (e) {
    erro.value = e.message
  }
}

const alterado = () =>
  !salvo && (imagemNova.value || removerImagem.value || f.nome !== (existente.value?.nome || '') ||
    JSON.stringify(f.tamanhos) !== JSON.stringify(existente.value?.tamanhos || []))
onBeforeRouteLeave(
  () =>
    !alterado() ||
    dialogo.confirmar({
      titulo: 'Sair sem salvar?',
      mensagem: 'As alterações feitas nesta peça serão perdidas.',
      ok: 'Sair sem salvar',
      cancelar: 'Continuar editando',
    }),
)
</script>

<template>
  <div class="p-pagina">
    <div class="p-topo">
      <div>
        <RouterLink :to="{ name: modoPublicar ? 'novas' : 'produtos' }" class="voltar">← {{ modoPublicar ? 'Novas peças' : 'Produtos' }}</RouterLink>
        <h1>{{ modoPublicar ? 'Adicionar à loja' : codigo ? `Editar ${codigo}` : 'Novo produto' }}</h1>
        <p v-if="modoPublicar">Confira os dados que vieram da planilha, escolha a categoria e publique.</p>
      </div>
      <button v-if="existente" type="button" class="btn btn-perigo btn-pequeno" @click="excluir"><Icone nome="lixo" /> Excluir</button>
    </div>

    <p v-if="naoEncontrado" class="p-erro">Produto não encontrado. Ele pode ter sido excluído.</p>

    <form v-else class="formulario" @submit.prevent="salvar(true)">
      <section class="p-cartao coluna-foto">
        <h2>Foto</h2>
        <div class="foto" :class="{ vazia: !previa }">
          <img v-if="previa" :src="previa" alt="Pré-visualização da foto" />
          <span v-else><Icone nome="camera" /> Sem foto</span>
        </div>
        <label class="btn btn-claro escolher">
          <input id="produto-foto" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="escolherFoto" />
          <Icone nome="camera" /> {{ preparandoFoto ? 'Preparando…' : previa ? 'Trocar foto' : 'Escolher foto' }}
        </label>
        <button v-if="previa" type="button" class="btn btn-perigo btn-pequeno" @click="tirarFoto">Remover foto</button>
        <small class="dica">JPG, PNG ou WEBP, até 10 MB. A foto é reduzida automaticamente antes do envio.</small>
        <p v-if="!temFoto && !codigo" class="sem-foto-aviso">Sem foto, a peça fica em <strong>Novas peças</strong> e só vai para a loja depois que você adicionar a foto.</p>
      </section>

      <section class="p-cartao coluna-dados">
        <h2>Dados da peça</h2>
        <label class="p-campo">
          <span>Nome</span>
          <input id="produto-nome" v-model="f.nome" class="p-input" maxlength="100" placeholder="Ex.: Blusa Ciganinha Rosa" required />
        </label>
        <label class="p-campo">
          <span>Cor <small>(opcional)</small></span>
          <input id="produto-cor" v-model="f.cor" class="p-input" maxlength="30" placeholder="Ex.: Branca" />
        </label>
        <div class="duas">
          <label class="p-campo">
            <span>Preço (R$)</span>
            <input id="produto-preco" v-model="f.preco" class="p-input num" inputmode="decimal" placeholder="59,90" required />
          </label>
          <div class="p-campo">
            <label for="produto-categoria"><span>Categoria</span></label>
            <div class="linha-cat">
              <select id="produto-categoria" ref="campoCategoria" v-model="f.categoria" class="p-input" :class="{ vazio: !f.categoria }">
                <option value="">{{ store.categorias.length ? 'Escolha a categoria…' : 'Nenhuma categoria criada' }}</option>
                <option v-for="c in store.categorias" :key="c.slug" :value="c.slug">{{ c.nome }}</option>
              </select>
              <button type="button" class="btn btn-claro btn-pequeno" @click="modalCategoria = true"><Icone nome="mais" /> Nova</button>
            </div>
          </div>
        </div>

        <h2 class="sub">Tamanhos e estoque</h2>
        <small class="dica">A quantidade só aparece aqui no painel. Na loja, tamanho zerado aparece riscado e, se todos zerarem, a peça mostra ESGOTADO.</small>
        <div class="presets">
          <button v-for="t in PRESETS" :key="t" type="button" class="preset" :disabled="f.tamanhos.some((x) => x.tamanho === t)" @click="adicionarTamanho(t)">+ {{ t }}</button>
        </div>
        <div class="outro">
          <input id="produto-tamanho-outro" v-model="tamanhoOutro" class="p-input" maxlength="10" placeholder="Outro tamanho" @keydown.enter.prevent="adicionarTamanho(tamanhoOutro)" />
          <button type="button" class="btn btn-claro btn-pequeno" @click="adicionarTamanho(tamanhoOutro)">Adicionar</button>
        </div>
        <ul v-if="f.tamanhos.length" class="tamanhos">
          <li v-for="(t, i) in f.tamanhos" :key="t.tamanho">
            <strong>{{ t.tamanho }}</strong>
            <label class="sr-only" :for="`qtd-${i}`">Quantidade do tamanho {{ t.tamanho }}</label>
            <input :id="`qtd-${i}`" v-model.number="t.quantidade" class="p-input num" type="number" min="0" max="99999" inputmode="numeric" />
            <span class="un">un.</span>
            <button type="button" class="remover" :aria-label="`Remover tamanho ${t.tamanho}`" @click="f.tamanhos.splice(i, 1)"><Icone nome="fechar" /></button>
          </li>
        </ul>
        <p v-else class="sem-tamanho">Adicione pelo menos um tamanho (use ÚNICO para tamanho único).</p>

        <label v-if="!modoPublicar" class="ativo">
          <input id="produto-ativo" v-model="f.ativo" type="checkbox" />
          <span><strong>Mostrar na loja</strong><small>Desmarque para esconder a peça sem excluí-la.</small></span>
        </label>

        <p v-if="erro" class="p-erro" role="alert">{{ erro }}</p>
        <div v-if="modoPublicar" class="acoes">
          <button type="button" class="btn btn-claro" :disabled="salvando" @click="salvar(false)">Salvar sem publicar</button>
          <button class="btn" :disabled="salvando || preparandoFoto || !temFoto" :title="temFoto ? '' : 'Adicione uma foto para publicar'">
            {{ salvando ? 'Publicando…' : 'Publicar na loja' }}
          </button>
        </div>
        <div v-else class="acoes">
          <RouterLink :to="{ name: 'produtos' }" class="btn btn-claro">Cancelar</RouterLink>
          <button class="btn" :disabled="salvando || preparandoFoto">{{ salvando ? 'Salvando…' : codigo ? 'Salvar alterações' : 'Cadastrar produto' }}</button>
        </div>
      </section>
    </form>

    <ModalCategoria v-if="modalCategoria" @criada="categoriaCriada" @fechar="modalCategoria = false" />
  </div>
</template>

<style scoped>
.sem-foto-aviso { margin: 0; font-size: 13px; line-height: 1.5; background: #fff7fb; border: 1px dashed var(--rosa); border-radius: 10px; padding: 10px; }
.p-campo span small { font-weight: 500; color: var(--texto-suave); }
select.vazio { color: var(--texto-suave); }
.voltar { font-size: 13px; font-weight: 600; color: var(--rosa); text-decoration: none; }
.formulario { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 760px) { .formulario { grid-template-columns: minmax(0, 1fr); } }
.coluna-foto, .coluna-dados { display: flex; flex-direction: column; gap: 12px; }
.p-cartao h2 { margin: 0; }
.sub { margin-top: 8px !important; }
.foto { aspect-ratio: 3 / 4; border-radius: 12px; overflow: hidden; background: var(--rosa-claro); display: grid; place-items: center; color: var(--rosa); max-width: 100%; }
.foto img { width: 100%; height: 100%; object-fit: cover; }
.foto span { display: inline-flex; gap: 6px; align-items: center; font-weight: 600; }
.escolher { cursor: pointer; }
.dica { color: var(--texto-suave); font-size: 12px; line-height: 1.5; }
.duas { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 12px; }
@media (max-width: 480px) { .duas { grid-template-columns: minmax(0, 1fr); } }
.p-campo label span { font-size: 13px; font-weight: 600; }
.linha-cat { display: flex; gap: 8px; }
.presets { display: flex; flex-wrap: wrap; gap: 6px; }
.preset { border: 1.5px dashed var(--rosa); background: var(--branco); color: var(--rosa); border-radius: 8px; padding: 6px 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
.preset:disabled { opacity: .35; cursor: default; }
.outro { display: flex; gap: 8px; max-width: 320px; }
.tamanhos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
.tamanhos li { display: flex; align-items: center; gap: 8px; border: 1px solid var(--borda); border-radius: 10px; padding: 6px 8px; }
.tamanhos strong { min-width: 44px; }
.tamanhos .p-input { min-height: 36px; padding: 6px 8px; width: 80px; }
.un { font-size: 12px; color: var(--texto-suave); }
.remover { margin-left: auto; border: 0; background: none; color: var(--texto-suave); cursor: pointer; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; }
.remover:hover { background: #fbe4e4; color: var(--vermelho); }
.sem-tamanho { margin: 0; font-size: 13px; color: var(--amarelo); }
.ativo { display: flex; gap: 10px; align-items: flex-start; padding: 12px; background: #fdf6fa; border-radius: 10px; cursor: pointer; }
.ativo input { width: 20px; height: 20px; accent-color: var(--rosa); margin-top: 2px; }
.ativo span { display: flex; flex-direction: column; gap: 2px; }
.ativo small { color: var(--texto-suave); font-size: 12px; }
.acoes { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
</style>
