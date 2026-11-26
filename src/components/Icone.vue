<script setup>
// Ícones em SVG (traço), sem biblioteca externa.
defineProps({ nome: { type: String, required: true } })
const D = {
  whatsapp: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5h.01',
  telefone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  sacola: 'M6 7h12l-1 13H7L6 7zm3 0V5a3 3 0 0 1 6 0v2',
  seta: 'M5 12h14m-6-6 6 6-6 6',
  local: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm8 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  estoque: 'M3 7l9-4 9 4-9 4-9-4zm0 5 9 4 9-4M3 17l9 4 9-4',
  etiqueta: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9zm5-4.5h.01',
  pasta: 'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z',
  planilha: 'M4 3h16v18H4zM4 9h16M4 15h16M10 3v18',
  usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  lixo: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  lapis: 'M4 20h4L19 9l-4-4L4 16v4zm10-14 4 4',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.3-4.3',
  baixar: 'M12 4v11m-5-5 5 5 5-5M5 20h14',
  subir: 'M12 20V9m-5 5 5-5 5 5M5 4h14',
  cima: 'M6 15l6-6 6 6',
  baixo: 'M6 9l6 6 6-6',
  fechar: 'M6 6l12 12M18 6 6 18',
  alerta: 'M12 3 2 20h20L12 3zm0 6v5m0 3h.01',
  check: 'M5 12l5 5 9-10',
}
</script>

<template>
  <svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="D[nome]" />
  </svg>
</template>
