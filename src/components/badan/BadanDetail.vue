<template>
  <div class="bd-detail">
    <p v-if="!row" class="bd-gone" data-test="gone">Timbangannya nggak ketemu. Mungkin udah dihapus.</p>
    <template v-else>
      <div class="bd-head">
        <h2 data-test="title">{{ dLong(row.weighedOn) }}</h2>
        <div class="bd-sub">{{ jam(row.weighedAt) }} <span class="bd-chip" :class="row.source === 'manual' ? 'mut' : 'green'" data-test="source">{{ row.source === 'manual' ? 'isi manual' : 'dari gambar' }}</span></div>
      </div>
      <div class="bd-main" data-test="main">
        <div v-for="k in MAIN" :key="k" class="bd-t3">
          <div class="k">{{ METRIC_LABEL[k][1] }}</div>
          <div class="v">{{ fmt(row[k], METRICS[k].dec) }}<small v-if="UNIT[k]">{{ UNIT[k] }}</small></div>
          <div class="c">
            <template v-if="cmp(k)">
              <template v-if="cmp(k).same">sama kayak rata-rata 7 hari</template>
              <template v-else><span :class="cmp(k).tone">{{ cmp(k).sign }}{{ cmp(k).abs }}</span> dari rata-rata 7 hari ({{ cmp(k).avg }})</template>
            </template>
          </div>
        </div>
      </div>
      <div class="b-label">Lainnya</div>
      <div class="shell"><div class="core bd-list" data-test="list">
        <div v-for="k in SUBS" :key="k" class="r">
          <span class="k">{{ METRIC_LABEL[k][0] }}</span>
          <span class="a">rata-rata {{ fmt(avg7(store.weighings, k, row.weighedOn), ADEC[k]) }}</span>
          <span class="v">{{ fmt(row[k], METRICS[k].dec) }}<small v-if="UNIT[k]">{{ UNIT[k] }}</small></span>
        </div>
        <div class="r">
          <span class="k">Tipe badan</span>
          <span class="v">{{ type ? type.label : '–' }}<em v-if="type">{{ type.zepp }} di Zepp</em></span>
        </div>
      </div></div>
      <div class="bd-btns">
        <button type="button" class="go" data-test="edit" @click="$emit('edit')"><PhPencilSimple :size="17" weight="bold" />Ubah</button>
        <button type="button" class="del" data-test="delete" :disabled="busy" @click="confirmDelete"><PhTrash :size="17" weight="bold" />Hapus</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { BODY_TYPES, METRICS, METRIC_LABEL, UNIT, avg7, fmt, tone } from '@/lib/badan.js'
import { dLong, dShort, jam } from '@/lib/badanView.js'
import { errorLines, showToast } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/** Detail satu timbangan: 3 angka utama + selisih dari rata-rata 7 hari, Lainnya, Ubah / Hapus. */
const props = defineProps({ weighingId: { type: [Number, String], required: true } })
const emit = defineEmits(['edit', 'done'])

const MAIN = ['weight', 'fat', 'muscle']
const SUBS = ['water', 'visceral', 'bone', 'protein', 'bmr', 'bmi', 'score']
/** Desimal rata-rata (sama kayak mockup: tulang 2, BMR & skor 0, sisanya 1). */
const ADEC = { weight: 1, fat: 1, muscle: 1, water: 1, visceral: 1, bone: 2, protein: 1, bmr: 0, bmi: 1, score: 0 }

const store = useBadanStore()
const busy = ref(false)
defineExpose({ busy })

const found = computed(() => store.weighings.find((w) => w.id === Number(props.weighingId)) ?? null)
// Abis dihapus, barisnya ilang dari store sebelum induk sempat nutup layar ini → tahan yang terakhir kelihatan.
const last = ref(found.value)
const deleted = ref(false)
watch(found, (w) => w && (last.value = w))
const row = computed(() => found.value ?? (deleted.value ? last.value : null))
const type = computed(() => BODY_TYPES.find((t) => t.key === row.value?.bodyType) ?? null)

function cmp(k) {
  const v = row.value[k]
  if (typeof v !== 'number') return null
  const avg = avg7(store.weighings, k, row.value.weighedOn)
  const dv = Number((v - avg).toFixed(ADEC[k]))
  if (dv === 0) return { same: true }
  const t = tone(store.target?.arah ?? null, k, dv)
  return { sign: dv > 0 ? '+' : '−', abs: fmt(Math.abs(dv), ADEC[k]), avg: fmt(avg, ADEC[k]), tone: t === 'good' ? 'gl' : t === 'bad' ? 'rd' : '' }
}

let confirming = false
async function confirmDelete() {
  if (confirming || busy.value) return
  confirming = true
  const r = row.value
  try {
    const sheet = await actionSheetController.create({
      header: `Hapus timbangan ${dShort(r.weighedOn)}, ${jam(r.weighedAt)}?`,
      subHeader: 'Angkanya ilang dari riwayat, grafik, dan rata-rata 7 hari.',
      buttons: [{ text: 'Hapus', role: 'destructive', data: 'delete' }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (data !== 'delete') return
    busy.value = true
    deleted.value = true
    // Vue 3.5 buang emit dari komponen yang udah dicopot → kabarin induk DULU, baru ubah store.
    emit('done')
    try {
      await store.remove(r.id)
      showToast('Timbangan dihapus')
    } catch (err) {
      deleted.value = false
      showToast(errorLines(err)[0])
    }
  } finally {
    busy.value = false
    confirming = false
  }
}
</script>
