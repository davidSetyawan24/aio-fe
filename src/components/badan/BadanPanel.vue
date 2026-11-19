<template>
  <!-- Ke dalem ion-app (bukan body): action sheet Ionic (konfirmasi Hapus / Ganti) dipasang di ion-app, kalau panel di body ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="bp-scrim" :class="{ show: open }" @click="requestClose" />
    <aside class="bp-panel" :class="{ show: open, wide: view === 'upload' && stage !== 'pick' }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!open)">
      <div class="bp-head">
        <button v-if="view === 'edit'" type="button" class="bp-x" aria-label="Balik" data-test="panel-back" @click="$emit('detail', id)"><PhCaretLeft :size="18" weight="bold" /></button>
        <h2 data-test="panel-title">{{ title }}</h2>
        <button type="button" class="bp-x" aria-label="Tutup" data-test="panel-close" @click="requestClose"><PhX :size="18" weight="bold" /></button>
      </div>
      <div v-if="open" class="bp-body">
        <p v-if="subtitle" class="bf-hint" style="margin: 6px 0 0" data-test="panel-sub">{{ subtitle }}</p>
        <BadanDetail v-if="view === 'detail'" ref="child" :key="`${formKey}d${id}`" :weighing-id="id" @edit="$emit('edit', id)" @done="(m) => $emit('done', m)" />
        <BadanForm v-else-if="view === 'manual'" ref="child" :key="`${formKey}m`" mode="manual" @done="(m) => $emit('done', m)" @open="(i) => $emit('detail', i)" />
        <BadanForm v-else-if="view === 'edit' && weighing" ref="child" :key="`${formKey}e${id}`" mode="edit" :initial="weighing" @done="(m) => $emit('done', m)" @open="(i) => $emit('detail', i)" />
        <BadanUpload v-else-if="view === 'upload'" ref="child" :key="`${formKey}u`" @stage="(s) => (stage = s)" @manual="$emit('manual')" @done="(m) => $emit('done', m)" @open="(i) => $emit('detail', i)" />
      </div>
    </aside>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { PhCaretLeft, PhX } from '@phosphor-icons/vue'
import BadanDetail from '@/components/badan/BadanDetail.vue'
import BadanForm from '@/components/badan/BadanForm.vue'
import BadanUpload from '@/components/badan/BadanUpload.vue'
import { dLong, jam } from '@/lib/badanView.js'
import { useBadanStore } from '@/stores/badan.js'

/** Panel geser dari kanan (≥768px) buat detail / isi manual / ubah timbangan. view: detail | manual | edit | upload. */
const props = defineProps({
  open: { type: Boolean, default: false },
  view: { type: String, default: 'detail' },
  id: { type: [Number, String], default: null },
  /** Naikin tiap buka biar isinya mulai dari awal. */
  formKey: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'edit', 'done', 'detail', 'manual'])

const store = useBadanStore()
const child = ref(null)
const stage = ref('pick')
// Panel baru dibuka / isinya mulai dari awal → balik sempit.
watch(() => [props.open, props.formKey, props.view], () => (stage.value = 'pick'))
const weighing = computed(() => store.weighings.find((w) => w.id === Number(props.id)) ?? null)

const UP_SUB = { pick: 'Dari gambar Zepp Life.', load: 'Bentar ya.', fail: 'Gambarnya nggak bisa dibaca.', result: 'Cek dulu angkanya, terus Simpen.' }
const TITLES = { upload: 'Upload timbangan', manual: 'Isi manual', edit: 'Ubah timbangan', detail: 'Detail timbangan' }
const UP_TITLE = { result: 'Hasil bacaan' }
const title = computed(() => (props.view === 'upload' ? UP_TITLE[stage.value] ?? TITLES.upload : TITLES[props.view] ?? ''))
const subtitle = computed(() => {
  if (props.view === 'upload') return UP_SUB[stage.value] ?? ''
  if (props.view === 'manual') return 'Ketik angka dari timbangan / Zepp Life.'
  if (props.view === 'edit' && weighing.value) return `${dLong(weighing.value.weighedOn)}, ${jam(weighing.value.weighedAt)}`
  return ''
})

/** Tutup — kecuali lagi nyimpen / hapus: ditutup di tengah jalan, hasilnya nggak nyampe. */
function requestClose() {
  if (child.value?.busy) return
  emit('close')
}

// Esc nutup panel — kecuali ada konfirmasi Ionic di atasnya: Esc-nya buat batalin itu aja.
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  requestClose()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
