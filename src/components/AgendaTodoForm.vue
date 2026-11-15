<template>
  <!-- novalidate: cek isian dari kita sendiri (bahasa Indonesia), bukan pesan bawaan browser. -->
  <form novalidate @submit.prevent="save">
    <div class="field first">
      <label class="flabel" for="todo-title">Mau ngapain?</label>
      <input
        id="todo-title"
        ref="titleEl"
        v-model="title"
        class="input"
        data-test="title"
        placeholder="Misal: beli kado buat nyokap"
        maxlength="120"
        autocomplete="off"
        autocapitalize="sentences"
        enterkeyhint="done"
        @keydown.enter.prevent="titleEl?.blur()"
      />
      <p v-if="errors.title" class="err" data-test="title-error">{{ errors.title }}</p>
    </div>

    <div class="field">
      <span class="flabel">Kapan?</span>
      <div class="row-pk">
        <button type="button" class="pk" :class="{ on: dueOn === today }" :data-when="today" @click="dueOn = today">Hari ini</button>
        <button type="button" class="pk" :class="{ on: dueOn === tomorrow }" :data-when="tomorrow" @click="dueOn = tomorrow">Besok</button>
        <button v-if="dueOn && dueOn !== today && dueOn !== tomorrow" type="button" class="pk on">{{ shortDate(dueOn) }}</button>
        <label class="pk"><PhCalendarBlank :size="15" /><input type="date" data-test="when-date" aria-label="Pilih tanggal" @input="$event.target.value && (dueOn = $event.target.value)" /></label>
        <button type="button" class="pk" :class="{ on: !dueOn }" data-when="" @click="dueOn = null">📥 Kapan-kapan</button>
      </div>
      <p v-if="errors.dueOn" class="err">{{ errors.dueOn }}</p>
    </div>

    <template v-if="dueOn">
      <div class="field" data-test="reminders">
        <span class="flabel">Ingetin gue <em>(maks 3)</em></span>
        <ReminderPicker v-model="reminders" kind="day" />
        <p v-if="errors.reminders" class="err">{{ errors.reminders }}</p>
      </div>
      <div class="field" data-test="repeat">
        <span class="flabel">Ulangi</span>
        <RepeatPicker v-model="repeat" :start-date="dueOn" />
        <p v-if="repeatError" class="err">{{ repeatError }}</p>
      </div>
    </template>
    <p v-else class="hint">Masuk laci Kapan-kapan. Pengingat & ulangi bisa diatur pas udah dijadwalin.</p>

    <div class="field">
      <label class="flabel" for="todo-note">Catatan</label>
      <textarea id="todo-note" v-model="note" class="input" data-test="note" placeholder="Boleh kosong" maxlength="1000" />
      <p v-if="errors.note" class="err">{{ errors.note }}</p>
    </div>

    <p v-if="error" class="err general">{{ error }}</p>
    <button type="submit" class="save" :disabled="busy">Simpan <span class="ic"><PhCheck :size="20" weight="bold" /></span></button>
    <button v-if="todo" type="button" class="ghostbtn" data-test="delete" :disabled="busy" @click="remove"><PhTrash :size="18" />Hapus to-do</button>
  </form>
</template>

<script setup>
import { computed, ref } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhCalendarBlank, PhCheck, PhTrash } from '@phosphor-icons/vue'
import ReminderPicker from '@/components/ReminderPicker.vue'
import RepeatPicker from '@/components/RepeatPicker.vue'
import { addDays, isRecurring, localToday, NO_REPEAT, shortDate } from '@/lib/agenda.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({
  /** To-do yang diubah (null = baru). */
  todo: { type: Object, default: null },
  /** Tanggal yang lagi dibuka di Agenda (default "Kapan?"). */
  date: { type: String, default: '' },
  /** To-do berulang: kemunculan yang di-tap → perubahan berlaku mulai tanggal ini. */
  occurrence: { type: String, default: null },
})
const emit = defineEmits(['saved', 'deleted'])
const store = useAgendaStore()
const today = computed(() => store.today ?? localToday())
const tomorrow = computed(() => addDays(today.value, 1))
const recurring = isRecurring(props.todo)
const occ = props.occurrence ?? props.todo?.dueOn ?? null

const titleEl = ref(null)
const title = ref(props.todo?.title ?? '')
/** Tanggal yang udah lewat → default hari ini (to-do baru nggak langsung telat). */
const dueOn = ref(props.todo ? (recurring ? occ : props.todo.dueOn) : props.date && props.date >= today.value ? props.date : today.value)
const reminders = ref([...(props.todo?.reminders ?? [])])
const repeat = ref({ ...(props.todo?.repeat ?? NO_REPEAT), days: [...(props.todo?.repeat?.days ?? [])] })
const note = ref(props.todo?.note ?? '')
const errors = ref({})
const error = ref('')
const busy = ref(false)
const repeatError = computed(() => errors.value['repeat.days'] || errors.value['repeat.until'] || errors.value.repeat)

function showError(err) {
  if (err?.fields) errors.value = Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
  else error.value = apiErrorMessage(err)
}

async function save() {
  if (busy.value) return
  errors.value = {}
  error.value = ''
  if (!title.value.trim()) return (errors.value = { title: 'Judulnya wajib diisi.' })
  const body = {
    title: title.value.trim(),
    dueOn: dueOn.value,
    reminders: dueOn.value ? reminders.value : [],
    repeat: dueOn.value ? repeat.value : { ...NO_REPEAT },
    note: note.value.trim() || null,
  }
  busy.value = true
  try {
    const saved = props.todo ? await store.updateTodo(props.todo.id, recurring ? { ...body, occurrence: occ } : body) : await store.createTodo(body)
    emit('saved', saved)
  } catch (err) {
    showError(err)
  } finally {
    busy.value = false
  }
}

/** To-do berulang: "Cuma yang ini / Yang ini & seterusnya". To-do biasa: konfirmasi. */
async function remove() {
  if (busy.value) return
  // Dikunci dari sebelum action sheet kebuka: tap dobel nggak boleh munculin dua pilihan / dua hapus.
  busy.value = true
  const t = props.todo
  const sheet = await actionSheetController.create(
    recurring
      ? {
          header: 'Hapus to-do berulang',
          subHeader: `${t.title} · ${shortDate(occ)}`,
          buttons: [
            { text: 'Cuma yang ini', role: 'destructive', data: 'one' },
            { text: 'Yang ini & seterusnya', role: 'destructive', data: 'following' },
            { text: 'Batal', role: 'cancel' },
          ],
        }
      : { header: `Hapus "${t.title}"?`, subHeader: 'Nggak bisa dibalikin.', buttons: [{ text: 'Hapus', role: 'destructive', data: 'all' }, { text: 'Batal', role: 'cancel' }] },
  )
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (!['one', 'following', 'all'].includes(data)) return (busy.value = false)
  try {
    await store.deleteTodo(t.id, data === 'all' ? undefined : data, data === 'all' ? undefined : occ)
    emit('deleted')
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
.save { width: 100%; margin-top: 22px; display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 6px 0 22px; border: 0; border-radius: 99px;
  background: var(--ink); color: var(--on-ink); font: 700 16px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.save:active { transform: scale(.98); }
.save .ic { width: 44px; height: 44px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
.ghostbtn { width: 100%; margin-top: 10px; height: 52px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 15px var(--ion-font-family); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.ghostbtn svg { color: var(--red); }
</style>
