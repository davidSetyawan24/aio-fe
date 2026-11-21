<template>
  <form class="gy-edit" :class="{ 'pf-shake': shake }" novalidate data-test="form" @submit.prevent="save">
    <div class="gy-fgrid">
      <label class="gy-nf" :class="{ bad: err.startedAt }"><span class="lb">Jam mulai</span><input v-model="start" type="time" data-test="start" :disabled="saving" /></label>
      <label class="gy-nf" :class="{ bad: err.endedAt }"><span class="lb">Jam selesai</span><input v-model="end" type="time" data-test="end" :disabled="saving" /></label>
    </div>
    <p v-if="err.startedAt" class="gy-ferr" data-test="err-startedAt">{{ err.startedAt }}</p>
    <p v-if="err.endedAt" class="gy-ferr" data-test="err-endedAt">{{ err.endedAt }}</p>

    <div class="shell" style="margin-top: 14px">
      <div class="gy-core">
        <div v-for="g in groups" :key="g.exerciseId" class="gy-dex">
          <div class="t"><span class="grow">{{ g.name }}</span></div>
          <div v-for="(r, j) in g.rows" :key="r.id" class="gy-erow" :class="{ gone: r.del }" data-test="eset">
            <div class="gy-eset">
              <span class="n">{{ j + 1 }}</span>
              <label class="gy-nf" :class="{ bad: r.err }"><span class="lb">kg</span><input v-model="r.weight" inputmode="decimal" data-test="kg" :disabled="saving || r.del" @keydown.enter.prevent /></label>
              <label class="gy-nf" :class="{ bad: r.err }"><span class="lb">reps</span><input v-model="r.reps" inputmode="numeric" data-test="reps" :disabled="saving || r.del" @keydown.enter.prevent /></label>
              <button type="button" class="del" :aria-label="r.del ? 'Batal hapus set' : 'Hapus set'" data-test="del" :disabled="saving" @click="r.del = !r.del"><PhArrowCounterClockwise v-if="r.del" :size="17" weight="bold" /><PhTrash v-else :size="17" /></button>
            </div>
            <p v-if="r.err" class="gy-ferr" data-test="err-row">{{ r.err }}</p>
          </div>
        </div>
      </div>
    </div>
    <p v-if="err.sets" class="gy-ferr" data-test="err-sets">{{ err.sets }}</p>

    <button type="submit" class="gy-save" data-test="save" :disabled="saving">Simpen perubahan <span><PhCheck :size="20" weight="bold" /></span></button>
    <div class="gy-note">PR, grafik, dan riwayat ikut dihitung ulang.</div>
  </form>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { PhArrowCounterClockwise, PhCheck, PhTrash } from '@phosphor-icons/vue'
import { ApiError } from '@/lib/api.js'
import { kgText, parseReps, parseWeight } from '@/lib/gym.js'
import { editTimes, wibIso } from '@/lib/gymReport.js'
import { showToast, useShake } from '@/lib/personalForm.js'
import { useGymStore } from '@/stores/gym.js'
import './gym.css'
import './gymReport.css'

/** Form ubah sesi selesai: jam mulai/selesai (WIB) + kg/reps tiap set + hapus set. Sukses → emit `saved` (Report baru). */
const props = defineProps({ report: { type: Object, required: true } })
const emit = defineEmits(['saved'])
const store = useGymStore()
const { shake, doShake } = useShake()

const session = props.report.session
const t = editTimes(session.startedAt, session.endedAt)
const start = ref(t.start)
const end = ref(t.end)
const groups = reactive(
  props.report.exercises.map((x) => ({
    exerciseId: x.exerciseId,
    name: x.name,
    rows: x.sets.map((s) => ({ id: s.id, weight: kgText(s.weight), reps: String(s.reps), del: false, err: null })),
  })),
)
const err = reactive({ startedAt: '', endedAt: '', sets: '' })
const saving = ref(false)
defineExpose({ busy: computed(() => saving.value) })

/** Cek lokal (pesannya sama kayak server) → body PUT, atau null kalau ada yang salah. */
function build() {
  err.startedAt = err.endedAt = err.sets = ''
  const startedAt = wibIso(t.startDate, start.value)
  const endedAt = wibIso(t.endDate, end.value)
  if (!startedAt) err.startedAt = 'Jam mulainya diisi dulu.'
  if (!endedAt) err.endedAt = 'Jam selesainya diisi dulu.'
  const sets = []
  const deleteSetIds = []
  let ok = !err.startedAt && !err.endedAt
  for (const g of groups) {
    for (const r of g.rows) {
      r.err = null
      if (r.del) {
        deleteSetIds.push(r.id)
        continue
      }
      const weight = parseWeight(r.weight)
      const reps = parseReps(r.reps)
      if (weight === null || weight <= 0) r.err = 'Bebannya harus lebih dari 0.'
      else if (reps === null || reps < 1 || reps > 100) r.err = 'Repsnya harus 1–100.'
      if (r.err) ok = false
      else sets.push({ id: r.id, weight, reps })
    }
  }
  return ok ? { startedAt, endedAt, sets, deleteSetIds } : null
}

const msg = (v) => String(Array.isArray(v) ? v[0] : v)

async function save() {
  if (saving.value) return
  const body = build()
  if (!body) return doShake()
  saving.value = true
  try {
    const report = await store.saveSession(session.id, body)
    showToast('Perubahan kesimpen ✓')
    emit('saved', report)
  } catch (e) {
    const f = e instanceof ApiError && e.status === 422 ? e.fields : null
    if (f && (f.startedAt || f.endedAt || f.sets)) {
      err.startedAt = f.startedAt ? msg(f.startedAt) : ''
      err.endedAt = f.endedAt ? msg(f.endedAt) : ''
      err.sets = f.sets ? msg(f.sets) : ''
      doShake()
    } else {
      showToast(e?.message || 'Nggak kesimpen. Coba lagi.')
    }
  } finally {
    saving.value = false
  }
}
</script>
