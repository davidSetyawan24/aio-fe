<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau panel di body bisa ketutup. Nggak ada scrim: halaman di belakang tetep keliatan & bisa discroll. -->
  <Teleport v-if="armed" to="ion-app">
    <aside ref="panelEl" class="aip" :class="{ show }" data-test="panel" role="dialog" aria-label="Chat AI" :aria-hidden="String(!open)">
      <AiChat v-if="open" ref="chat" :key="formKey" panel :context="context" :session-id="sessionId" :conv-id="convId" @close="$emit('close')" />
    </aside>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AiChat from '@/components/ai/AiChat.vue'

/** Panel chat AI di kanan (≥768px), lebar 460px. Naikin `formKey` tiap buka biar obrolannya kebuka ulang. */
const props = defineProps({
  open: { type: Boolean, default: false },
  context: { type: String, default: 'gym' },
  sessionId: { type: Number, default: null },
  convId: { type: Number, default: null },
  formKey: { type: Number, default: 0 },
})
const emit = defineEmits(['close'])
const chat = ref(null)
const panelEl = ref(null)
// Dipasang baru pas pertama kali dibuka (jadi nggak butuh ion-app selama belum dipakai); `show` nyusul biar geser masuknya jalan.
const armed = ref(props.open)
const show = ref(false)

watch(() => [props.open, props.formKey], async ([open]) => {
  if (!open) {
    show.value = false
    return
  }
  armed.value = true
  await nextTick()
  void panelEl.value?.offsetWidth
  show.value = true
  chat.value?.focus()
}, { immediate: true })

// Esc nutup panel — kecuali ada konfirmasi Ionic di atasnya: Esc-nya buat batalin itu aja.
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  emit('close')
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.aip { position: fixed; top: 0; right: 0; bottom: 0; z-index: 43; width: min(460px, 100vw); display: flex; flex-direction: column; background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family);
  border-left: 1px solid var(--hair); box-shadow: -30px 0 60px -40px rgba(0, 0, 0, .35); transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.aip.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
</style>
