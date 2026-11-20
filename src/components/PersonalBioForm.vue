<template>
  <form class="pd-form" novalidate :class="{ 'pf-shake': shake }" @submit.prevent="save">
    <h1 class="pf-title">Ubah biodata</h1>
    <p class="pf-hint" style="margin-top: 6px">Yang dikosongin nggak ditampilin.</p>

    <div class="p-glabel">Data diri</div>
    <div v-for="[key, label] in BIO_FIELDS" :key="key" class="pf-fld">
      <template v-if="key === 'birthDate'">
        <label :for="`pb-${key}`">{{ label }}</label>
        <div class="pb-pick">
          <span class="pb-val" :class="{ none: !form.fields.birthDate }" data-test="birth-text">{{ form.fields.birthDate ? birthDateLabel(form.fields.birthDate) : 'Pilih tanggal' }}</span>
          <input :id="`pb-${key}`" type="date" :data-test="`bio-${key}`" :value="form.fields.birthDate" :max="today" min="1900-01-01" @input="onBirth" @change="onBirth" />
          <button v-if="form.fields.birthDate" type="button" class="pb-clear" data-test="birth-clear" aria-label="Kosongin tanggal lahir" @click="form.fields.birthDate = ''"><PhX :size="14" weight="bold" /></button>
        </div>
        <p v-if="oldBirth && !form.fields.birthDate" class="pf-hint" data-test="birth-hint">Tanggal lahir lama ("{{ oldBirth }}") nggak kebaca, pilih ulang ya.</p>
      </template>
      <template v-else-if="key === 'gender'">
        <span class="pb-lbl" :id="`pb-${key}`">{{ label }}</span>
        <div class="pb-seg" role="group" :aria-labelledby="`pb-${key}`">
          <button v-for="[g, code] in GENDER_OPTS" :key="g" type="button" :class="{ on: form.fields.gender === g }" :data-test="`gender-${code}`" :aria-pressed="String(form.fields.gender === g)" @click="pickGender(g)">{{ g }}</button>
        </div>
      </template>
      <template v-else-if="key === 'height'">
        <label :for="`pb-${key}`">{{ label }}</label>
        <div class="pb-unit">
          <input :id="`pb-${key}`" v-model="form.fields.height" class="pf-in" inputmode="numeric" :data-test="`bio-${key}`" maxlength="3" autocomplete="off" @keydown.enter.prevent="focusNext" />
          <span>cm</span>
        </div>
      </template>
      <template v-else>
        <label :for="`pb-${key}`">{{ label }}</label>
        <input :id="`pb-${key}`" v-model="form.fields[key]" class="pf-in" :data-test="`bio-${key}`" :maxlength="MAX_VALUE" autocomplete="off" @keydown.enter.prevent="focusNext" />
      </template>
    </div>

    <div class="p-glabel">Data lain <small>{{ form.extra.length }}/{{ MAX_EXTRA }}</small></div>
    <div v-for="(x, i) in form.extra" :key="x.k" class="pb-extra">
      <input v-model="x.label" class="pf-in" :data-test="`extra-label-${i}`" placeholder="Label" aria-label="Label" :maxlength="MAX_LABEL" @keydown.enter.prevent="focusNext" />
      <input v-model="x.value" class="pf-in" :data-test="`extra-value-${i}`" placeholder="Isi" aria-label="Isi" :maxlength="MAX_VALUE" @keydown.enter.prevent="focusNext" />
      <button type="button" class="pb-x" :data-test="`extra-remove-${i}`" :aria-label="`Hapus data lain ${i + 1}`" @click="form.extra.splice(i, 1)"><PhX :size="16" weight="bold" /></button>
    </div>
    <button v-if="form.extra.length < MAX_EXTRA" type="button" class="pf-addrow" data-test="extra-add" @click="addExtra"><PhPlus :size="15" weight="bold" />Tambah data lain</button>
    <p v-else class="pf-hint">Maksimal {{ MAX_EXTRA }} data lain.</p>

    <div v-if="errors.length" class="pf-err" role="alert" data-test="form-error"><p v-for="m in errors" :key="m">{{ m }}</p></div>

    <button type="submit" class="pf-save" data-test="save" :disabled="busy">
      Simpan <span><span v-if="busy" class="pf-spin" /><PhCheck v-else :size="20" weight="bold" /></span>
    </button>
  </form>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { PhCheck, PhPlus, PhX } from '@phosphor-icons/vue'
import '@/components/personal.css'
import '@/components/personalForm.css'
import { wibNow } from '@/lib/home.js'
import { BIO_FIELDS, birthDateLabel, normGender, parseOldBirthDate } from '@/lib/personal.js'
import { MAX_EXTRA, MAX_LABEL, MAX_VALUE, bioErrors, blankBio, errorLines, focusNext, useShake } from '@/lib/personalForm.js'
import { usePersonalStore } from '@/stores/personal.js'

/**
 * Form biodata: 13 kolom (boleh kosong) + "Data lain". Tanggal lahir = pemilih tanggal, jenis kelamin = 2 tombol, tinggi = angka cm.
 * Isi lama yang dulu teks bebas dicoba dibaca; data lama baru berubah kalau disimpen. Sukses → emit `done(pesan)`.
 */
const emit = defineEmits(['done'])
const store = usePersonalStore()
const busy = ref(false)
defineExpose({ busy })

let seq = 0
const keyed = (x) => ({ k: ++seq, label: x.label, value: x.value })
const GENDER_OPTS = [['Laki-laki', 'male'], ['Perempuan', 'female']]
const today = store.today ?? wibNow().date
const bio = store.bio ?? blankBio()
const fields = { ...blankBio().fields, ...bio.fields }
const rawBirth = String(fields.birthDate ?? '').trim()
const parsedBirth = rawBirth ? parseOldBirthDate(rawBirth, today) : null
/** Tanggal lahir lama yang nggak kebaca → ditampilin di petunjuk biar bisa dipilih ulang. */
const oldBirth = rawBirth && !parsedBirth ? rawBirth : ''
const form = reactive({
  fields: { ...fields, birthDate: parsedBirth ?? '', gender: normGender(fields.gender) },
  extra: bio.extra.map(keyed),
})
const errors = ref([])
const { shake, doShake } = useShake()

const addExtra = () => form.extra.push(keyed({ label: '', value: '' }))
const onBirth = (e) => (form.fields.birthDate = e.target.value)
const pickGender = (g) => (form.fields.gender = form.fields.gender === g ? '' : g)

async function save() {
  if (busy.value) return
  errors.value = bioErrors(form, today)
  if (errors.value.length) return doShake()
  const body = {
    fields: Object.fromEntries(BIO_FIELDS.map(([k]) => [k, String(form.fields[k] ?? '').trim()])),
    // Baris yang cuma separuh keisi dibuang.
    extra: form.extra.map((x) => ({ label: x.label.trim(), value: x.value.trim() })).filter((x) => x.label && x.value),
  }
  busy.value = true
  try {
    await store.saveBio(body)
  } catch (err) {
    errors.value = errorLines(err)
    doShake()
    return
  } finally {
    busy.value = false
  }
  emit('done', 'Biodata kesimpen ✓')
}
</script>

<style scoped>
.pb-lbl { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin: 0 6px 6px; }
/* Input tanggal bawaan (transparan) nutup seluruh kotak: tap di mana aja buka pemilih tanggal. */
.pb-pick { position: relative; display: flex; align-items: center; height: 50px; padding: 0 16px; border-radius: 18px; background: var(--soft); color: var(--text); font: 600 16px var(--ion-font-family); box-sizing: border-box; }
.pb-val { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pb-val.none { color: var(--muted); }
.pb-pick input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; font-size: 16px; cursor: pointer; }
.pb-pick:has(input:focus-visible) { box-shadow: inset 0 0 0 2px var(--ink); }
.pb-clear { position: relative; z-index: 1; width: 30px; height: 30px; margin-right: -6px; border: 0; border-radius: 99px; background: var(--card); color: var(--muted); display: grid; place-items: center; cursor: pointer; }
.pb-seg { display: flex; padding: 4px; border-radius: 99px; background: var(--soft); }
.pb-seg button { flex: 1; height: 42px; border: 0; border-radius: 99px; background: transparent; font: 700 14px var(--ion-font-family); color: var(--muted); cursor: pointer; transition: background .25s var(--spring), color .2s; }
.pb-seg button.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); }
.pb-unit { position: relative; }
.pb-unit .pf-in { padding-right: 48px; }
.pb-unit span { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 14px; font-weight: 700; color: var(--muted); pointer-events: none; }
.pb-extra { display: grid; grid-template-columns: 1fr 1fr 38px; gap: 6px; margin-top: 8px; align-items: center; }
.pb-x { width: 38px; height: 38px; border: 0; border-radius: 12px; background: var(--soft); color: var(--muted); display: grid; place-items: center; cursor: pointer; }
</style>
