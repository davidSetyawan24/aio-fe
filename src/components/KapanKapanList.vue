<template>
  <div class="list">
    <div v-for="t in items" :key="t.id" data-test="someday">
      <AgendaTodoRow :row="t" @edit="$emit('edit', $event)" @error="fail">
        <button type="button" class="sched" :data-sched="t.id" @click="picking = picking === t.id ? null : t.id"><PhCalendarPlus :size="15" />Jadwalin</button>
      </AgendaTodoRow>
      <div v-if="picking === t.id" class="picks">
        <button type="button" class="pk" :data-to="today" @click="schedule(t, today)">Hari ini</button>
        <button type="button" class="pk" :data-to="tomorrow" @click="schedule(t, tomorrow)">Besok</button>
        <label class="pk"><PhCalendarBlank :size="15" /><input type="date" aria-label="Pilih tanggal" :min="today" @change="schedule(t, $event.target.value)" /></label>
      </div>
    </div>
    <div v-if="!items.length" class="empty">Kosong. Mantap 🎉</div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhCalendarBlank, PhCalendarPlus } from '@phosphor-icons/vue'
import AgendaTodoRow from '@/components/AgendaTodoRow.vue'
import { addDays, relLabel } from '@/lib/agenda.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({ items: { type: Array, required: true }, today: { type: String, required: true } })
const emit = defineEmits(['edit', 'scheduled'])
const store = useAgendaStore()
const picking = ref(null)
const busy = ref(false)
const error = ref('')
const tomorrow = computed(() => addDays(props.today, 1))

const fail = (err) => (error.value = apiErrorMessage(err))

/** Jadwalin: pindah dari laci ke tanggal itu. Tap dobel diabaikan. */
async function schedule(todo, date) {
  if (busy.value || !date) return
  busy.value = true
  error.value = ''
  try {
    await store.schedule(todo, date)
    picking.value = null
    emit('scheduled', relLabel(date, props.today))
  } catch (err) {
    fail(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.list { padding: 4px 6px; }
.sched { flex-shrink: 0; height: 32px; padding: 0 12px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 12px var(--ion-font-family); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; }
.picks { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 10px 12px 48px; }
.pk { height: 36px; padding: 0 13px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 13px var(--ion-font-family); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; }
.pk input { border: 0; background: transparent; color: inherit; font: inherit; font-size: 16px; width: 128px; }
.empty { padding: 18px 14px; color: var(--muted); font-size: 13.5px; text-align: center; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 6px 10px; }
</style>
