<template>
  <div class="bu" data-test="upload">
    <input ref="fileInput" type="file" accept="image/*" hidden data-test="file" @change="onFile" />

    <template v-if="stage === 'pick'">
      <button type="button" class="bu-drop" data-test="pick" @click="fileInput?.click()">
        <span class="dic"><PhImage :size="30" /></span>
        <b>Pilih gambar timbangan</b>
        <span>Gambar panjang hasil Bagikan dari Zepp Life</span>
      </button>
      <div class="b-label">Caranya</div>
      <div class="b-core">
        <ol class="bu-steps">
          <li><span>Buka <b>Zepp Life</b> → hasil timbang hari ini.</span></li>
          <li><span>Tap <b>Bagikan</b> → simpen gambar ke Foto.</span></li>
          <li><span>Balik ke sini, pilih gambarnya. Angkanya dibaca otomatis.</span></li>
        </ol>
      </div>
      <div class="bf-note"><PhEyeSlash :size="15" />Gambarnya nggak disimpen, cuma angkanya.</div>
      <button type="button" class="b-ghostbtn" style="margin-top: 16px" data-test="manual" @click="$emit('manual')"><PhPencilSimple :size="18" />Isi manual aja</button>
    </template>

    <div v-else class="bu-grid">
      <div class="bu-imgcol">
        <div class="b-core bu-strip">
          <span class="bu-thumb"><img :src="url" alt="" /></span>
          <div class="t"><b>{{ fileName }}</b><small>Gambar panjang dari Zepp Life</small></div>
          <button type="button" class="bu-lk" data-test="toggle-img" @click="showImg = !showImg">{{ showImg ? 'Tutup' : 'Liat gambar' }}</button>
        </div>
        <div class="bu-imgfull" :class="{ show: showImg }" data-test="imgfull"><img :src="url" alt="Gambar timbangan" /></div>
        <div v-if="stage === 'result'" class="bu-reread">
          <p><b>Ada yang beda sama gambar?</b>Kadang bacaan pertama meleset, coba sekali lagi.</p>
          <button type="button" class="pill small" data-test="reread" @click="reread"><PhArrowsClockwise :size="16" weight="bold" />&nbsp;Baca ulang</button>
        </div>
      </div>

      <div class="bu-main">
        <template v-if="stage === 'load'">
          <div class="bu-reading" data-test="loading">
            <span class="bu-spin" />
            <div><b>Lagi baca angkanya…</b><small>Biasanya 3–5 detik{{ reads > 1 ? ` · bacaan ke-${reads}` : '' }}</small></div>
          </div>
          <div class="bf-group"><span>Waktu timbang</span></div>
          <div class="bu-sk2"><div class="bu-sk" /><div class="bu-sk" /></div>
          <div class="bf-group"><span>Utama</span></div>
          <div class="bu-sk3"><div class="bu-sk big" /><div class="bu-sk big" /><div class="bu-sk big" /></div>
          <div class="bf-group"><span>Lainnya</span></div>
          <div class="bu-sk3 lain"><div v-for="n in 8" :key="n" class="bu-sk" /></div>
        </template>

        <template v-else-if="stage === 'fail'">
          <div class="b-core bu-fail" data-test="fail">
            <div class="em">😕</div>
            <h3>{{ failTitle }}</h3>
            <p>{{ failText }}</p>
            <div class="bu-btnrow">
              <button v-if="canRetry" type="button" class="pill" data-test="reread" @click="reread"><PhArrowsClockwise :size="17" weight="bold" />&nbsp;Baca ulang</button>
              <button type="button" class="pill ghost" :style="canRetry ? '' : 'grid-column: span 2'" data-test="manual" @click="$emit('manual')"><PhPencilSimple :size="17" />&nbsp;Isi manual</button>
            </div>
          </div>
          <div class="bf-note"><PhEyeSlash :size="15" />Gambarnya nggak disimpen, cuma angkanya.</div>
        </template>

        <BadanForm v-else-if="result" ref="form" :key="reads" mode="result" :initial="result" :check="result.check ?? []" @done="(m) => $emit('done', m)" @open="(i) => $emit('open', i)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { PhArrowsClockwise, PhEyeSlash, PhImage, PhPencilSimple } from '@phosphor-icons/vue'
import BadanForm from '@/components/badan/BadanForm.vue'
import { resizeToWidth } from '@/lib/imageResize.js'
import { showToast } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/**
 * Upload gambar Zepp Life → dibaca → form hasil. Keadaan: pick | load | result | fail.
 * Gambarnya cuma object URL di memori (dicabut pas ditutup), nggak disimpen di mana-mana.
 * Baca ulang = kirim lagi blob yang SAMA.
 */
const emit = defineEmits(['done', 'open', 'manual', 'stage'])
defineExpose({ get busy() { return form.value?.busy ?? false } })

const store = useBadanStore()
const fileInput = ref(null)
const form = ref(null)
const stage = ref('pick')
const url = ref('')
const fileName = ref('Gambar timbangan')
const showImg = ref(false)
const reads = ref(0)
const result = ref(null)
const failStatus = ref(0)
const failMessage = ref('')
let blob = null
let token = 0

watch(stage, (s) => emit('stage', s), { immediate: true })

const BLOCKED = (s) => s === 429 || s === 503
const canRetry = computed(() => !BLOCKED(failStatus.value))
const failTitle = computed(() => (BLOCKED(failStatus.value) ? 'Belum bisa baca gambar' : 'Nggak kebaca'))
const failText = computed(() =>
  BLOCKED(failStatus.value) || (failStatus.value && failStatus.value !== 502 && failMessage.value)
    ? failMessage.value
    : 'Coba Baca ulang atau isi manual. Pastiin gambarnya hasil Bagikan dari Zepp Life, bukan foto layar yang kepotong.',
)

function revoke() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
}

async function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const mine = ++token
  stage.value = 'load'
  reads.value = 1
  fileName.value = file.name || 'Gambar timbangan'
  showImg.value = false
  const resized = await resizeToWidth(file)
  if (mine !== token) return
  blob = resized
  revoke()
  url.value = URL.createObjectURL(blob)
  await run(mine)
}

async function run(mine = ++token) {
  stage.value = 'load'
  try {
    const res = await store.scan(blob)
    if (mine !== token) return
    result.value = res
    stage.value = 'result'
  } catch (err) {
    if (mine !== token) return
    failStatus.value = err?.status ?? 0
    failMessage.value = err?.message ?? ''
    stage.value = 'fail'
  }
}

async function reread() {
  if (!blob) return
  reads.value += 1
  await run()
  const n = result.value?.check?.length ?? 0
  if (stage.value === 'result' && n) showToast(`Dibaca ulang · tinggal ${n} angka yang perlu dicek`)
}

onBeforeUnmount(() => {
  token += 1
  revoke()
})
</script>
