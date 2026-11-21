<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic (konfirmasi Hapus) dipasang di ion-app, kalau panel di body konfirmasinya ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="gy-pscrim" :class="{ show: open }" @click="requestClose" />
    <aside class="gy-panel" :class="{ show: open }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!open)">
      <div class="gy-phead">
        <button v-if="editing" type="button" class="gy-xbtn" aria-label="Balik ke detail" data-test="panel-back" @click="$emit('stop-edit')"><PhCaretLeft :size="18" weight="bold" /></button>
        <h2>
          <template v-if="editing">Ubah sesi</template>
          <template v-else-if="title">{{ title }}</template>
          <small v-if="sub">{{ sub }}</small>
        </h2>
        <button type="button" class="gy-xbtn" aria-label="Tutup" data-test="panel-x" @click="requestClose"><PhX :size="18" weight="bold" /></button>
      </div>
      <div class="gy-pbody">
        <GymSessionView v-if="open && id != null" ref="view" :key="id" :id="id" :editing="editing" @edit="$emit('edit')" @stop-edit="$emit('stop-edit')" @deleted="$emit('deleted')" />
      </div>
    </aside>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { PhCaretLeft, PhX } from '@phosphor-icons/vue'
import GymSessionView from '@/components/gym/GymSessionView.vue'
import { PROGRAM_EMOJI, PROGRAM_LABEL } from '@/lib/gym.js'
import { sessionDateLine } from '@/lib/gymReport.js'
import { useGymStore } from '@/stores/gym.js'
import './gym.css'
import './gymReport.css'

/** Panel geser dari kanan (PC) buat detail / ubah sesi di Riwayat. */
const props = defineProps({
  open: { type: Boolean, default: false },
  id: { type: Number, default: null },
  editing: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'edit', 'stop-edit', 'deleted'])
const store = useGymStore()
const view = ref(null)

const session = computed(() => (props.id != null ? store.reports[props.id]?.session ?? null : null))
const title = computed(() => (session.value ? `${PROGRAM_EMOJI[session.value.program]} ${PROGRAM_LABEL[session.value.program]}` : ''))
const sub = computed(() => (session.value ? sessionDateLine(session.value.startedAt, session.value.endedAt) : ''))

/** Tutup — kecuali lagi nyimpen / hapus: ditutup di tengah jalan, hasilnya nggak nyampe. */
function requestClose() {
  if (view.value?.busy) return
  emit('close')
}

// Esc nutup panel — kecuali ada popup Ionic (konfirmasi Hapus) di atasnya.
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  requestClose()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
