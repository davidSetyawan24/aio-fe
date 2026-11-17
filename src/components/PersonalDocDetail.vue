<template>
  <div class="pd-detail">
    <p v-if="!doc" class="pf-state" data-test="gone">Dokumennya nggak ketemu. Mungkin udah dihapus.</p>
    <template v-else>
      <div class="pf-toprow">
        <slot name="back" />
        <button type="button" class="p-edit pd-edit" data-test="edit" @click="$emit('edit')"><PhPencilSimple :size="15" />Ubah</button>
      </div>
      <div class="pf-head">
        <div class="p-av" :style="{ background: type.tint }">{{ type.emoji }}</div>
        <div>
          <h2>{{ docTitle(doc) }}</h2>
          <span class="pf-subtle">{{ subline }}</span>
        </div>
      </div>

      <div class="p-glabel">Nomor</div>
      <div class="shell"><div class="p-core">
        <template v-for="(name, i) in type.fields" :key="name">
          <CopyRow v-if="doc.values[i]" :label="name" :value="doc.values[i]" />
        </template>
      </div></div>

      <template v-if="doc.dates.length">
        <div class="p-glabel">Masa berlaku</div>
        <div class="shell"><div class="p-core">
          <div v-for="dt in doc.dates" :key="dt.key" class="pf-dcard" data-test="date-card">
            <div class="pf-dtop">
              <div>
                <div class="pf-dk">{{ dateName(dt) }}</div>
                <div class="pf-dbig">{{ formatDate(dt.on) }}</div>
              </div>
              <span class="p-chip" :class="chipClass(dt)" style="margin-top: 2px">{{ dt.state === 'ok' ? farText(dt.daysLeft) : stateText(dt) }}</span>
            </div>
            <div v-if="dt.reminders.length" class="pf-rems">
              <span v-for="r in dt.reminders" :key="`${r.n}${r.unit}${r.time}`" class="pf-rem" data-test="rem"><PhBell :size="13" weight="fill" />{{ reminderText(r) }}</span>
            </div>

            <button v-if="dt.key === 'tax'" type="button" class="pf-act" data-test="pay-tax" :disabled="busy" @click="payTax">
              <PhCheck :size="16" weight="bold" />Udah bayar pajak
            </button>
            <div v-else-if="renewing === dt.key" class="pf-renew">
              <div class="pf-dk">Berlaku s.d. yang baru</div>
              <div class="pf-rrow">
                <input v-model="newDate" type="date" data-test="renew-date" aria-label="Berlaku s.d. yang baru" />
                <button type="button" data-test="renew-save" :disabled="busy" @click="renew(dt)">Simpan</button>
              </div>
            </div>
            <button v-else type="button" class="pf-act" data-test="renew" @click="startRenew(dt)">
              <PhArrowsClockwise :size="16" weight="bold" />Udah diperpanjang
            </button>
          </div>
        </div></div>
      </template>
      <p v-else-if="type.note && subline !== type.note" class="pf-hint">{{ type.note }}.</p>

      <p v-if="error" class="pf-err" role="alert" data-test="detail-error">{{ error }}</p>
      <button type="button" class="pf-ghost" data-test="delete" :disabled="busy" @click="confirmDelete">
        <PhTrash :size="18" weight="bold" />Hapus {{ docTitle(doc) }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhArrowsClockwise, PhBell, PhCheck, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import CopyRow from '@/components/CopyRow.vue'
import '@/components/personal.css'
import '@/components/personalForm.css'
import { DOC_TYPES, docSub, docTitle, farText, formatDate, reminderText, stateText } from '@/lib/personal.js'
import { errorLines, showToast } from '@/lib/personalForm.js'
import { usePersonalStore } from '@/stores/personal.js'

/** Detail satu dokumen: nomor (tap = salin), masa berlaku + pengingat, perpanjang / bayar pajak, hapus. */
const props = defineProps({ docId: { type: [Number, String], required: true } })
const emit = defineEmits(['edit', 'done'])

const store = usePersonalStore()
const busy = ref(false)
defineExpose({ busy })

const found = computed(() => store.documents.find((d) => d.id === Number(props.docId)) ?? null)
// Habis dihapus, dokumennya hilang dari store sebelum induk sempat nutup layar ini → tahan yang terakhir kelihatan.
const last = ref(found.value)
watch(found, (d) => d && (last.value = d))
const doc = computed(() => found.value ?? (deleted.value ? last.value : null))
const deleted = ref(false)

const type = computed(() => DOC_TYPES[doc.value?.type ?? 'ktp'])
const subline = computed(() => docSub(doc.value) || type.value.note || (type.value.dates.length ? 'Ada masa berlakunya' : 'Cuma nomor'))
const dateName = (dt) => type.value.dates.find((d) => d.key === dt.key)?.name ?? 'Berlaku s.d.'
const chipClass = (dt) => (dt.state === 'late' ? 'red' : dt.state === 'soon' ? 'amber' : 'mut')

const renewing = ref(null)
const newDate = ref('')
const error = ref('')


/** +5 tahun (isian awal kotak perpanjang); 29 Feb → 28 Feb. */
function plusFive(on) {
  const [y, m, d] = on.split('-')
  return `${Number(y) + 5}-${m}-${m === '02' && d === '29' ? '28' : d}`
}
function startRenew(dt) {
  error.value = ''
  newDate.value = plusFive(dt.on)
  renewing.value = dt.key
}

async function run(action) {
  if (busy.value) return false
  error.value = ''
  busy.value = true
  try {
    await action()
    return true
  } catch (err) {
    error.value = errorLines(err)[0]
    return false
  } finally {
    busy.value = false
  }
}

async function payTax() {
  const title = doc.value.label || 'STNK'
  let next
  const ok = await run(async () => {
    const updated = await store.taxPaid(doc.value.id)
    next = updated.dates.find((d) => d.key === 'tax')?.on
  })
  if (ok) showToast(`Pajak ${title} beres ✓ · lanjut s.d. ${formatDate(next)}`)
}

async function renew(dt) {
  if (!newDate.value) {
    error.value = 'Isi tanggal barunya dulu.'
    return
  }
  const name = doc.value.type === 'stnk' ? dateName(dt) : docTitle(doc.value)
  const ok = await run(() => store.renewDate(doc.value.id, dt.key, newDate.value))
  if (!ok) return
  renewing.value = null
  showToast(`${name} udah diperpanjang ✓`)
}

let confirming = false
async function confirmDelete() {
  if (confirming || busy.value) return
  confirming = true
  const title = docTitle(doc.value)
  try {
    const sheet = await actionSheetController.create({
      header: `Hapus ${title}?`,
      subHeader: 'Dokumennya hilang permanen.',
      buttons: [{ text: 'Hapus', role: 'destructive', data: 'delete' }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (data !== 'delete') return
    deleted.value = true
    const ok = await run(() => store.removeDoc(doc.value.id))
    if (ok) emit('done', `${title} dihapus`)
    else deleted.value = false
  } finally {
    confirming = false
  }
}
</script>

<style scoped>
.pd-edit { margin-left: auto; }
</style>
