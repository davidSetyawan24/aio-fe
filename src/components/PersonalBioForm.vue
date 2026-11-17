<template>
  <form class="pd-form" novalidate :class="{ 'pf-shake': shake }" @submit.prevent="save">
    <h1 class="pf-title">Ubah biodata</h1>
    <p class="pf-hint" style="margin-top: 6px">Yang dikosongin nggak ditampilin.</p>

    <div class="p-glabel">Data diri</div>
    <div v-for="[key, label] in BIO_FIELDS" :key="key" class="pf-fld">
      <label :for="`pb-${key}`">{{ label }}</label>
      <input :id="`pb-${key}`" v-model="form.fields[key]" class="pf-in" :data-test="`bio-${key}`" :maxlength="MAX_VALUE" autocomplete="off" @keydown.enter.prevent="focusNext" />
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
import { BIO_FIELDS } from '@/lib/personal.js'
import { MAX_EXTRA, MAX_LABEL, MAX_VALUE, bioErrors, blankBio, errorLines, focusNext } from '@/lib/personalForm.js'
import { usePersonalStore } from '@/stores/personal.js'

/** Form biodata: 12 kolom bebas (boleh kosong) + "Data lain". Sukses → emit `done(pesan)`. */
const emit = defineEmits(['done'])
const store = usePersonalStore()
const busy = ref(false)
defineExpose({ busy })

let seq = 0
const keyed = (x) => ({ k: ++seq, label: x.label, value: x.value })
const bio = store.bio ?? blankBio()
const form = reactive({
  fields: { ...blankBio().fields, ...bio.fields },
  extra: bio.extra.map(keyed),
})
const errors = ref([])
const shake = ref(false)

const addExtra = () => form.extra.push(keyed({ label: '', value: '' }))

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

async function save() {
  if (busy.value) return
  errors.value = bioErrors(form)
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
.pb-extra { display: grid; grid-template-columns: 1fr 1fr 38px; gap: 6px; margin-top: 8px; align-items: center; }
.pb-x { width: 38px; height: 38px; border: 0; border-radius: 12px; background: var(--soft); color: var(--muted); display: grid; place-items: center; cursor: pointer; }
</style>
