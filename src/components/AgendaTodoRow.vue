<template>
  <div class="td" :class="{ done: row.done }" data-test="todo">
    <button type="button" class="ck" data-test="check" :aria-label="row.done ? 'Batal centang' : 'Centang'" @click="toggle"><PhCheck :size="14" weight="bold" /></button>
    <button type="button" class="t" data-test="edit-todo" @click="$emit('edit', row)">
      {{ row.title }}
      <small v-if="sub"><PhRepeat v-if="repeat" :size="12" /> {{ sub }}</small>
    </button>
    <span v-if="row.late" class="tag red" data-test="late">telat {{ row.late }} hari</span>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCheck, PhRepeat } from '@phosphor-icons/vue'
import { reminderLabel, repeatLabel } from '@/lib/agenda.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({ row: { type: Object, required: true } })
const emit = defineEmits(['edit', 'error'])
const store = useAgendaStore()

const repeat = computed(() => repeatLabel(props.row.repeat))
const sub = computed(() => [repeat.value, props.row.reminders.map(reminderLabel).join(', ')].filter(Boolean).join(' · '))
/** Centang langsung berubah di layar (store), balik lagi + pesan kalau gagal. */
const toggle = () => store.toggle(props.row).catch((err) => emit('error', err))
</script>

<style scoped>
.td { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
.td + .td { box-shadow: inset 0 1px 0 var(--hair); }
.ck { width: 26px; height: 26px; flex-shrink: 0; border-radius: 99px; border: 0; box-shadow: inset 0 0 0 2px var(--muted); background: transparent; display: grid; place-items: center;
  cursor: pointer; color: #141410; transition: background .25s var(--spring), box-shadow .25s; }
.ck svg { opacity: 0; transform: scale(.4); transition: opacity .3s var(--spring), transform .3s var(--spring); }
.done .ck { background: var(--lime); box-shadow: none; }
.done .ck svg { opacity: 1; transform: none; }
.t { flex: 1; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--text); font: 600 15px var(--ion-font-family); text-align: left; cursor: pointer; transition: opacity .3s; }
.t small { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; font-weight: 600; }
.t small svg { vertical-align: -2px; }
.done .t { text-decoration: line-through; opacity: .4; }
.tag { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; font-size: 11px; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
.tag.red { background: rgba(240, 83, 61, .12); color: var(--red); }
</style>
