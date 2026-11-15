<template>
  <div>
    <div v-if="!item" class="seg" role="tablist" aria-label="Jenis">
      <span class="ind" :style="{ transform: kind === 'event' ? 'translateX(100%)' : 'none' }" />
      <button type="button" role="tab" :class="{ on: kind === 'todo' }" data-kind="todo" @click="kind = 'todo'">To-do</button>
      <button type="button" role="tab" :class="{ on: kind === 'event' }" data-kind="event" @click="kind = 'event'">Acara</button>
    </div>
    <h3 v-else class="ttl">{{ kind === 'event' ? 'Ubah acara' : 'Ubah to-do' }}</h3>
    <AgendaEventForm v-if="kind === 'event'" ref="formEl" :event="item" :date="date" :occurrence="occurrence" @saved="$emit('saved', $event)" />
    <AgendaTodoForm v-else ref="formEl" :todo="item" :date="date" :occurrence="occurrence" @saved="$emit('saved', $event)" @deleted="$emit('deleted')" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AgendaEventForm from '@/components/AgendaEventForm.vue'
import AgendaTodoForm from '@/components/AgendaTodoForm.vue'

/** Tambah (segmented To-do | Acara) / ubah — dipakai halaman HP & dialog iPad/PC. */
const props = defineProps({
  /** 'todo' | 'event' (buat ubah, atau pilihan awal buat tambah). */
  initialKind: { type: String, default: 'todo' },
  item: { type: Object, default: null },
  date: { type: String, default: '' },
  occurrence: { type: String, default: null },
})
defineEmits(['saved', 'deleted'])
const kind = ref(props.initialKind === 'event' ? 'event' : 'todo')
const formEl = ref(null)
defineExpose({ focusTitle: () => formEl.value?.focusTitle() })
</script>

<style scoped>
.seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border-radius: 99px; background: var(--soft); margin-bottom: 4px; }
.seg button { position: relative; z-index: 1; height: 40px; border: 0; border-radius: 99px; background: transparent; font: 700 14px var(--ion-font-family); color: var(--muted); cursor: pointer; transition: color .3s; }
.seg button.on { color: var(--text); }
.seg .ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 99px; background: var(--card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); transition: transform .45s var(--spring); }
.ttl { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 4px; }
</style>
