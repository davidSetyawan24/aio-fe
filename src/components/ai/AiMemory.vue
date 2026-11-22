<template>
  <div class="cview" data-test="mem-view">
    <div class="label"><span>Ingatan AI</span><small data-test="count">{{ ai.memories.length }} catatan</small></div>
    <div class="shell"><div class="core">
      <p v-if="memLoading" class="memrow muted" data-test="mem-loading">Bentar ya…</p>
      <div v-else-if="memFailed" class="memrow muted" data-test="mem-failed"><span>Ingatannya nggak kebuka. <button type="button" class="lnk" data-test="mem-retry" @click="loadMem">Coba lagi</button></span></div>
      <template v-else>
        <div v-for="m in ai.memories" :key="m.id" class="memrow" data-test="mem">
          <div><p>{{ m.text }}</p><small>{{ m.source === 'ai' ? 'dari obrolan' : 'lo tambahin sendiri' }} · {{ shortDate(m.createdAt) }}</small></div>
          <button type="button" data-test="mem-del" aria-label="Hapus" @click="removeMem(m.id)"><PhX :size="16" weight="bold" /></button>
        </div>
        <div v-if="!ai.memories.length" class="memrow" data-test="mem-empty"><div><p class="muted">Belum ada catatan.</p></div></div>
      </template>
      <form class="memadd" novalidate data-test="mem-form" @submit.prevent="add">
        <input v-model="draft" type="text" maxlength="200" placeholder="Tambah sendiri, mis. lutut kanan cedera" data-test="mem-input" enterkeyhint="done" @input="ai.memoryError = ''">
        <button type="submit" :disabled="adding" data-test="mem-add">Tambah</button>
      </form>
      <p v-if="ai.memoryError" class="memerr" data-test="mem-error">{{ ai.memoryError }}</p>
    </div></div>
    <p class="cvnote">AI nyatet sendiri hal penting dari obrolan biar inget di obrolan berikutnya. Yang nggak bener, hapus aja.</p>

    <div class="label"><span>Pemakaian AI</span></div>
    <div class="shell"><div class="core">
      <p v-if="useLoading" class="memrow muted" data-test="use-loading">Bentar ya…</p>
      <div v-else-if="useFailed" class="memrow muted" data-test="use-failed"><span>Pemakaiannya nggak kebuka. <button type="button" class="lnk" data-test="use-retry" @click="loadUse">Coba lagi</button></span></div>
      <template v-else>
        <div class="usage" data-test="usage"><div class="k">Bulan ini · {{ monthLabel(thisMonth) }}</div><div class="big" data-test="usage-big">{{ rupiah(current.rupiah) }}</div><div class="s" data-test="usage-sub">{{ current.evaluations }} evaluasi · {{ current.messages }} pesan chat</div></div>
        <div v-for="m in older" :key="m.month" class="urow" data-test="usage-row"><span>{{ monthLabel(m.month) }}</span><span>{{ rupiah(m.rupiah) }} · {{ m.evaluations }} evaluasi · {{ m.messages }} pesan</span></div>
      </template>
    </div></div>
    <p v-if="ai.usage" class="cvnote" data-test="kurs">Hitungan AIO: token × harga Mistral Large 4 × kurs Rp{{ kurs }}/$. Bisa beda dikit dari tagihan asli Mistral.</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { monthLabel, rupiah, shortDate } from '@/lib/ai.js'
import { wibNow } from '@/lib/home.js'
import { showToast } from '@/lib/personalForm.js'
import { useAiStore } from '@/stores/ai.js'

/** Ingatan AI (catatan yang AI & lo simpen) + pemakaian per bulan, di dalem chat. */
const ai = useAiStore()
const draft = ref('')
const adding = ref(false)
const memLoading = ref(true)
const memFailed = ref(false)
const useLoading = ref(true)
const useFailed = ref(false)

const thisMonth = wibNow().date.slice(0, 7)
const months = computed(() => ai.usage?.months ?? [])
const current = computed(() => months.value.find((m) => m.month === thisMonth) ?? { month: thisMonth, rupiah: 0, evaluations: 0, messages: 0 })
const older = computed(() => months.value.filter((m) => m.month !== thisMonth))
const kurs = computed(() => Number(ai.usage?.kursIdr ?? 0).toLocaleString('id-ID'))

async function loadMem() {
  memLoading.value = true
  memFailed.value = false
  memFailed.value = (await ai.loadMemories()) === null
  memLoading.value = false
}
async function loadUse() {
  useLoading.value = true
  useFailed.value = false
  useFailed.value = (await ai.loadUsage()) === null
  useLoading.value = false
}
onMounted(() => {
  ai.memoryError = ''
  loadMem()
  loadUse()
})

async function add() {
  const text = draft.value.trim()
  if (adding.value) return
  adding.value = true
  try {
    const mem = await ai.addMemory(text)
    if (mem) {
      draft.value = ''
      await showToast('Kecatet ✓')
    }
  } finally {
    adding.value = false
  }
}

async function removeMem(id) {
  if (await ai.removeMemory(id)) await showToast('Catatan dihapus')
}
</script>

<style scoped>
.core { padding: 0; overflow: hidden; }
.cview { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 14px 24px; }
.label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 6px 10px; gap: 10px; }
.label small { font-size: inherit; }
.memrow { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: 8px; align-items: center; margin: 0; padding: 12px 8px 12px 14px; }
.memrow + .memrow { box-shadow: inset 0 1px 0 var(--hair); }
.memrow p { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.45; overflow-wrap: anywhere; }
.memrow small { display: block; font-size: 11.5px; font-weight: 700; color: var(--muted); margin-top: 3px; }
.memrow > button { width: 36px; height: 36px; border: 0; border-radius: 99px; background: var(--soft); display: grid; place-items: center; cursor: pointer; color: var(--red); }
.memrow.muted, .muted { color: var(--muted); font-size: 13px; font-weight: 700; }
.memrow.muted { display: block; }
.memadd { display: flex; gap: 8px; padding: 10px; box-shadow: inset 0 1px 0 var(--hair); }
.memadd input { flex: 1; min-width: 0; height: 44px; border: 0; outline: 0; border-radius: 16px; background: var(--soft); color: var(--text); padding: 0 14px; font: 600 16px var(--ion-font-family); }
.memadd button { height: 44px; padding: 0 16px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 800 13.5px var(--ion-font-family); cursor: pointer; }
.memadd button:disabled { opacity: .5; }
.memerr { margin: 0; padding: 0 16px 12px; font-size: 12.5px; font-weight: 700; color: var(--red); }
.cvnote { margin: 10px 6px 0; font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.5; }
.usage { padding: 16px; }
.usage .k { font-size: 12px; font-weight: 700; color: var(--muted); }
.usage .big { font-size: 34px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.usage .s { font-size: 13px; font-weight: 700; color: var(--muted); margin-top: 2px; }
.urow { display: flex; justify-content: space-between; gap: 10px; padding: 11px 16px; font-size: 13.5px; font-weight: 700; box-shadow: inset 0 1px 0 var(--hair); font-variant-numeric: tabular-nums; }
.urow span:last-child { color: var(--muted); text-align: right; }
.lnk { border: 0; background: none; padding: 0; font: 800 12.5px var(--ion-font-family); color: var(--text); text-decoration: underline; cursor: pointer; }
</style>
