<template>
  <div data-test="event-detail">
    <h3>{{ event.title }}</h3>
    <div class="when">
      <span class="tag"><PhClock :size="13" /> {{ when }}</span>
      <span v-if="repeat" class="tag"><PhRepeat :size="13" /> {{ repeat }}</span>
      <span v-for="r in event.reminders" :key="reminderKey(r)" class="tag"><PhBell :size="13" /> {{ reminderLabel(r) }}</span>
    </div>
    <template v-if="event.location">
      <div class="loc">
        <span class="ic"><PhMapPin :size="20" weight="fill" /></span>
        <span class="grow"><b>{{ event.location }}</b><span>Lokasi</span></span>
      </div>
      <a class="maps" data-test="maps" :href="mapsUrl(event.location)" target="_blank" rel="noopener"><PhNavigationArrow :size="17" />Buka di Google Maps</a>
    </template>
    <div v-if="event.note" class="note"><small>Catatan</small>{{ event.note }}</div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="btns">
      <button type="button" data-test="delete" :disabled="busy" @click="remove"><PhTrash :size="17" class="r" />Hapus</button>
      <button type="button" class="primary" data-test="edit" @click="$emit('edit', event)"><PhPencilSimple :size="17" />Ubah</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhBell, PhClock, PhMapPin, PhNavigationArrow, PhPencilSimple, PhRepeat, PhTrash } from '@phosphor-icons/vue'
import { isRecurring, mapsUrl, reminderKey, reminderLabel, repeatLabel, shortDate } from '@/lib/agenda.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAgendaStore } from '@/stores/agenda.js'

/** `event` = satu kemunculan dari GET /agenda (ada `occurrence`). */
const props = defineProps({ event: { type: Object, required: true } })
const emit = defineEmits(['edit', 'deleted'])
const store = useAgendaStore()
const busy = ref(false)
const error = ref('')

const repeat = computed(() => repeatLabel(props.event.repeat))
const when = computed(() => {
  const e = props.event
  const multi = !isRecurring(e) && e.startDate !== e.endDate
  const date = shortDate(isRecurring(e) ? e.occurrence : e.startDate)
  if (e.allDay) return multi ? `${shortDate(e.startDate)} – ${shortDate(e.endDate)} · seharian` : `${date} · seharian`
  return `${date} · ${e.startTime}–${e.endTime}${multi ? ` s.d. ${shortDate(e.endDate)}` : ''}`
})

/** Acara berulang: "Cuma yang ini / Yang ini & seterusnya". Acara biasa: konfirmasi. */
async function remove() {
  if (busy.value) return
  const e = props.event
  const recurring = isRecurring(e)
  const sheet = await actionSheetController.create(
    recurring
      ? {
          header: 'Hapus acara berulang',
          subHeader: `${e.title} · ${shortDate(e.occurrence)}`,
          buttons: [
            { text: 'Cuma yang ini', role: 'destructive', data: 'one' },
            { text: 'Yang ini & seterusnya', role: 'destructive', data: 'following' },
            { text: 'Batal', role: 'cancel' },
          ],
        }
      : { header: `Hapus "${e.title}"?`, subHeader: 'Nggak bisa dibalikin.', buttons: [{ text: 'Hapus', role: 'destructive', data: 'all' }, { text: 'Batal', role: 'cancel' }] },
  )
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (!['one', 'following', 'all'].includes(data) || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await store.deleteEvent(e.id, data === 'all' ? undefined : data, data === 'all' ? undefined : e.occurrence)
    emit('deleted')
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
h3 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 6px; }
.when { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 16px; }
.tag { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 11px; border-radius: 99px; background: var(--soft); color: var(--muted); font-size: 12.5px; font-weight: 700; }
.loc { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 20px; background: var(--soft); }
.loc .ic { width: 40px; height: 40px; border-radius: 14px; background: var(--card); display: grid; place-items: center; color: var(--red); flex-shrink: 0; }
.loc .grow { flex: 1; min-width: 0; }
.loc b { display: block; font-size: 14.5px; }
.loc .grow span { font-size: 12.5px; color: var(--muted); }
.maps { display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; margin-top: 8px; border-radius: 99px; background: var(--ink); color: var(--on-ink); font-weight: 700; font-size: 14px; text-decoration: none; }
.note { margin-top: 14px; padding: 14px 16px; border-radius: 18px; box-shadow: inset 0 0 0 1.5px var(--hair); font-size: 14px; line-height: 1.5; white-space: pre-line; }
.note small { display: block; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .14em; margin-bottom: 4px; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 12px 4px 0; }
.btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
.btns button { height: 52px; border: 0; border-radius: 99px; font: 700 15px var(--ion-font-family); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  background: var(--soft); color: var(--text); }
.btns button.primary { background: var(--ink); color: var(--on-ink); }
.btns .r { color: var(--red); }
</style>
