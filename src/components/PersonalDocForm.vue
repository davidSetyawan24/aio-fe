<template>
  <div class="pd-form">
    <p v-if="isEdit && !original" class="pf-state" data-test="gone">Dokumennya nggak ketemu. Mungkin udah dihapus.</p>

    <template v-else-if="step === 'pick'">
      <h1 class="pf-title">Dokumen apa?</h1>
      <div class="pf-typegrid" data-test="type-grid">
        <button v-for="key in DOC_TYPE_ORDER" :key="key" type="button" class="pf-tbtn" :data-test="`type-${key}`" @click="pickType(key)">
          <span class="p-av" :style="{ background: DOC_TYPES[key].tint }">{{ DOC_TYPES[key].emoji }}</span>
          <span>{{ DOC_TYPES[key].name }}<small>{{ typeCaption(key) }}</small></span>
        </button>
      </div>
    </template>

    <form v-else novalidate :class="{ 'pf-shake': shake }" @submit.prevent="save">
      <button v-if="!isEdit" type="button" class="pf-back" data-test="change-type" @click="step = 'pick'"><PhCaretLeft :size="18" weight="bold" />Ganti jenis</button>
      <div class="pf-head">
        <div class="p-av" :style="{ background: t.tint }">{{ t.emoji }}</div>
        <div>
          <h2>{{ isEdit ? 'Ubah ' : '' }}{{ t.custom ? (isEdit ? docTitle(original) : 'Dokumen lain') : t.name }}</h2>
          <span class="pf-subtle">{{ isEdit ? 'Abis disimpen, pengingat ikut baru' : 'Dokumen baru' }}</span>
        </div>
      </div>

      <template v-if="t.custom">
        <div class="p-glabel">Nama dokumen</div>
        <input v-model="form.label" class="pf-in" data-test="label" placeholder="mis. Kartu member gym" :maxlength="MAX_LABEL" autocomplete="off" @keydown.enter.prevent="focusNext" />
      </template>
      <template v-else-if="t.labelHint">
        <div class="p-glabel">Label <small>opsional</small></div>
        <input v-model="form.label" class="pf-in" data-test="label" :placeholder="t.labelHint" :maxlength="MAX_LABEL" autocomplete="off" @keydown.enter.prevent="focusNext" />
      </template>

      <div class="p-glabel">Nomor</div>
      <div v-for="(name, i) in t.fields" :key="name" class="pf-fld">
        <label :for="`pf-v${i}`">{{ name }}</label>
        <input :id="`pf-v${i}`" v-model="form.values[i]" class="pf-in" :data-test="`val-${i}`" :inputmode="textual(name) ? 'text' : 'numeric'" :placeholder="name"
          :maxlength="MAX_VALUE" autocomplete="off" @keydown.enter.prevent="focusNext" />
      </div>
      <p v-if="t.note" class="pf-hint">{{ t.note }}, jadi nggak ada pengingat.</p>

      <template v-if="t.dates.length">
        <div class="p-glabel">Masa berlaku & pengingat</div>
        <div v-for="(def, i) in t.dates" :key="def.key" class="pf-datebox">
          <div class="pf-ttl">{{ def.name }}<small v-if="def.optional">opsional</small></div>
          <input v-model="form.dates[i].on" type="date" class="pf-in" :data-test="`date-${i}`" :aria-label="def.name" @keydown.enter.prevent="focusNext" />
          <p v-if="def.key === 'tax'" class="pf-hint">Liat tanggal "berlaku s.d." di lembar pengesahan pajak tahunan STNK.</p>
          <DocReminderPicker v-model="form.dates[i].reminders" />
        </div>
        <p class="pf-hint">Notif nongol di layar HP + masuk lonceng. Isinya cuma nama dokumen & tanggal, nomornya nggak ikut.</p>
      </template>

      <div v-if="errors.length" class="pf-err" role="alert" data-test="form-error"><p v-for="m in errors" :key="m">{{ m }}</p></div>

      <button type="submit" class="pf-save" data-test="save" :disabled="busy">
        Simpan <span><span v-if="busy" class="pf-spin" /><PhCheck v-else :size="20" weight="bold" /></span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { PhCaretLeft, PhCheck } from '@phosphor-icons/vue'
import DocReminderPicker from '@/components/DocReminderPicker.vue'
import '@/components/personal.css'
import '@/components/personalForm.css'
import { DOC_TYPES, DOC_TYPE_ORDER, docTitle } from '@/lib/personal.js'
import { MAX_LABEL, MAX_VALUE, blankDoc, docErrors, docPayload, docToForm, errorLines, focusNext } from '@/lib/personalForm.js'
import { usePersonalStore } from '@/stores/personal.js'

/** Form dokumen: baru (pilih jenis dulu) / ubah (jenis dikunci). Sukses → emit `done(pesan, { docId })`, yang nutup layar & ngasih toast induknya. */
const props = defineProps({ docId: { type: [Number, String], default: null } })
const emit = defineEmits(['done'])

const store = usePersonalStore()
const busy = ref(false)
defineExpose({ busy })

// Dibaca sekali pas dibikin: Ionic nyimpen halaman, `docId` bisa nggak sengaja berubah di belakang.
const isEdit = props.docId !== null && props.docId !== ''
const original = isEdit ? store.documents.find((d) => d.id === Number(props.docId)) ?? null : null

const type = ref(original?.type ?? null)
const step = ref(isEdit ? 'fill' : 'pick')
const form = reactive(original ? docToForm(original) : { label: '', values: [], dates: [] })
const errors = ref([])
const shake = ref(false)
const t = computed(() => DOC_TYPES[type.value ?? 'ktp'])

function pickType(key) {
  if (type.value !== key) {
    type.value = key
    Object.assign(form, blankDoc(key))
  }
  step.value = 'fill'
}

function typeCaption(key) {
  const def = DOC_TYPES[key]
  if (key === 'stnk') return '2 tanggal'
  if (def.custom) return 'bebas'
  return def.dates.length ? 'ada masa berlaku' : 'cuma nomor'
}
const textual = (name) => /plat|rangka|mesin|paspor|visa/i.test(name)

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

async function save() {
  if (busy.value) return
  errors.value = docErrors(type.value, form)
  if (errors.value.length) return doShake()
  const body = docPayload(type.value, form)
  busy.value = true
  let saved
  try {
    // Ubah: label dikirim selalu (kosong = label dihapus), bukan dilewat.
    saved = isEdit ? await store.updateDoc(original.id, { ...body, label: body.label ?? '' }) : await store.createDoc(body)
  } catch (err) {
    errors.value = errorLines(err)
    doShake()
    return
  } finally {
    busy.value = false
  }
  emit('done', isEdit ? 'Kesimpen ✓' : `${docTitle(saved)} ditambahin ✓`, { docId: saved.id })
}
</script>
