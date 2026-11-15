<template>
  <!-- novalidate: cek isian dari kita sendiri (bahasa Indonesia), bukan pesan bawaan browser. -->
  <form novalidate @submit.prevent="save">
    <div class="field first">
      <label class="flabel" for="ev-title">Acara apa?</label>
      <input
        id="ev-title"
        ref="titleEl"
        v-model="title"
        class="input"
        data-test="title"
        placeholder="Misal: Nikahan Raka"
        maxlength="80"
        autocomplete="off"
        autocapitalize="sentences"
        enterkeyhint="next"
        @keydown.enter.prevent="locationEl?.focus()"
      />
      <p v-if="errors.title" class="err" data-test="title-error">{{ errors.title }}</p>
    </div>

    <div class="field">
      <button type="button" class="swrow" role="switch" :aria-checked="allDay" data-test="allday" @click="toggleAllDay">Seharian <span class="sw" :class="{ on: allDay }" /></button>
    </div>

    <div class="field">
      <span class="flabel">Mulai</span>
      <div :class="{ two: !allDay }">
        <input v-model="startDate" type="date" class="input" data-test="start-date" aria-label="Tanggal mulai" />
        <input v-if="!allDay" v-model="startTime" type="time" class="input" data-test="start-time" aria-label="Jam mulai" />
      </div>
    </div>
    <div v-if="!allDay || !recurringNow" class="field">
      <span class="flabel">Selesai</span>
      <div :class="{ two: !allDay && !recurringNow }">
        <input v-if="!recurringNow" v-model="endDate" type="date" class="input" data-test="end-date" :min="startDate" aria-label="Tanggal selesai" />
        <input v-if="!allDay" v-model="endTime" type="time" class="input" data-test="end-time" aria-label="Jam selesai" />
      </div>
      <p v-if="timeError" class="err" data-test="time-error">{{ timeError }}</p>
    </div>

    <div class="field">
      <label class="flabel" for="ev-loc">Lokasi</label>
      <div class="with-ic">
        <PhMapPin :size="19" />
        <input
          id="ev-loc"
          ref="locationEl"
          v-model="location"
          class="input"
          data-test="location"
          placeholder="Nama tempat / alamat (boleh kosong)"
          maxlength="200"
          autocomplete="off"
          enterkeyhint="done"
          @keydown.enter.prevent="locationEl?.blur()"
        />
      </div>
      <p v-if="errors.location" class="err">{{ errors.location }}</p>
    </div>

    <div class="field">
      <span class="flabel">Ingetin gue <em>(maks 3)</em></span>
      <ReminderPicker v-model="reminders" :kind="allDay ? 'day' : 'before'" />
      <p v-if="errors.reminders" class="err">{{ errors.reminders }}</p>
    </div>
    <div class="field">
      <span class="flabel">Ulangi</span>
      <RepeatPicker v-model="repeat" :start-date="startDate" />
      <p v-if="repeatError" class="err">{{ repeatError }}</p>
    </div>

    <div class="field">
      <label class="flabel" for="ev-note">Catatan</label>
      <textarea id="ev-note" v-model="note" class="input" data-test="note" placeholder="Boleh kosong (dress code, nomor meja, dll)" maxlength="1000" />
      <p v-if="errors.note" class="err">{{ errors.note }}</p>
    </div>

    <p v-if="error" class="err general">{{ error }}</p>
    <button type="submit" class="save" :disabled="busy">Simpan <span class="ic"><PhCheck :size="20" weight="bold" /></span></button>
  </form>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhCheck, PhMapPin } from '@phosphor-icons/vue'
import ReminderPicker from '@/components/ReminderPicker.vue'
import RepeatPicker from '@/components/RepeatPicker.vue'
import { defaultReminders, isRecurring, NO_REPEAT, shortDate } from '@/lib/agenda.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({
  /** Acara yang diubah (isi lengkap; null = baru). */
  event: { type: Object, default: null },
  /** Tanggal yang lagi dibuka di Agenda (acara baru). */
  date: { type: String, default: '' },
  /** Acara berulang: kemunculan yang lagi diubah. */
  occurrence: { type: String, default: null },
})
const emit = defineEmits(['saved'])
const store = useAgendaStore()
const e = props.event
const wasRecurring = isRecurring(e)
const occ = props.occurrence ?? e?.startDate ?? null

const titleEl = ref(null)
const locationEl = ref(null)
const title = ref(e?.title ?? '')
const allDay = ref(e?.allDay ?? false)
// Acara berulang dibuka dari satu kemunculan → isian mulai dari tanggal itu.
const startDate = ref(e ? (wasRecurring ? occ : e.startDate) : props.date)
const endDate = ref(e ? (wasRecurring ? occ : e.endDate) : props.date)
const startTime = ref(e?.startTime ?? '19:00')
const endTime = ref(e?.endTime ?? '21:00')
const location = ref(e?.location ?? '')
const note = ref(e?.note ?? '')
const reminders = ref(e ? [...e.reminders] : defaultReminders(false))
const repeat = ref({ ...(e?.repeat ?? NO_REPEAT), days: [...(e?.repeat?.days ?? [])] })
const errors = ref({})
const error = ref('')
const busy = ref(false)

const recurringNow = computed(() => repeat.value.freq !== 'none')
const timeError = computed(() => errors.value.endTime || errors.value.startTime || errors.value.endDate || errors.value.startDate)
const repeatError = computed(() => errors.value['repeat.days'] || errors.value['repeat.until'] || errors.value.repeat)

// Selesai nggak boleh sebelum mulai; acara berulang cuma 1 hari.
watch([startDate, recurringNow], () => {
  if (recurringNow.value || endDate.value < startDate.value) endDate.value = startDate.value
})

/** Ganti seharian ↔ berjam: pengingat yang jenisnya nggak cocok dibuang, kosong → default jenis baru. */
function toggleAllDay() {
  allDay.value = !allDay.value
  const kind = allDay.value ? 'day' : 'before'
  const kept = reminders.value.filter((r) => r.type === kind)
  reminders.value = kept.length ? kept : defaultReminders(allDay.value)
}

function showError(err) {
  if (err?.fields) errors.value = Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
  else error.value = apiErrorMessage(err)
}

async function askScope() {
  const sheet = await actionSheetController.create({
    header: 'Ubah acara berulang',
    subHeader: `${e.title} · ${shortDate(occ)}`,
    buttons: [
      { text: 'Cuma yang ini', data: 'one' },
      { text: 'Yang ini & seterusnya', data: 'following' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  return ['one', 'following'].includes(data) ? data : null
}

async function save() {
  if (busy.value) return
  errors.value = {}
  error.value = ''
  if (!title.value.trim()) return (errors.value = { title: 'Judulnya wajib diisi.' })
  const body = {
    title: title.value.trim(),
    allDay: allDay.value,
    startDate: startDate.value,
    endDate: recurringNow.value ? startDate.value : endDate.value,
    startTime: allDay.value ? null : startTime.value,
    endTime: allDay.value ? null : endTime.value,
    location: location.value.trim() || null,
    note: note.value.trim() || null,
    reminders: reminders.value,
    repeat: repeat.value,
  }
  busy.value = true
  try {
    let saved
    if (!e) saved = await store.createEvent(body)
    else if (!wasRecurring) saved = await store.updateEvent(e.id, body)
    else {
      const scope = await askScope()
      if (!scope) return
      saved = await store.updateEvent(e.id, { ...body, scope, occurrence: occ })
    }
    emit('saved', saved)
  } catch (err) {
    showError(err)
  } finally {
    busy.value = false
  }
}

defineExpose({ focusTitle: () => titleEl.value?.focus() })
</script>

<style scoped src="./agenda-form.css"></style>
<style scoped>
.first { margin-top: 6px; }
.general { margin-top: 14px; }
.swrow { width: 100%; display: flex; align-items: center; justify-content: space-between; height: 50px; padding: 0 8px 0 16px; border: 0; border-radius: 18px; background: var(--soft);
  color: var(--text); font: 700 15px var(--ion-font-family); cursor: pointer; }
.sw { width: 50px; height: 30px; border-radius: 99px; background: rgba(138, 138, 130, .35); position: relative; transition: background .3s; }
.sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .2); transition: transform .35s var(--spring); }
.sw.on { background: var(--ink); }
.sw.on::after { transform: translateX(20px); }
:root.theme-dark .sw.on::after { background: #141410; }
.save { width: 100%; margin-top: 22px; display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 6px 0 22px; border: 0; border-radius: 99px;
  background: var(--ink); color: var(--on-ink); font: 700 16px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.save:active { transform: scale(.98); }
.save .ic { width: 44px; height: 44px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
</style>
