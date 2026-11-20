<template>
  <div class="bu" data-test="sl-upload">
    <input ref="fileInput" type="file" accept="image/*" hidden data-test="file" @change="onFile" />

    <template v-if="stage === 'pick'">
      <button type="button" class="bu-drop" data-test="pick" @click="fileInput?.click()">
        <span class="dic"><PhMoon :size="30" /></span>
        <b>Pilih gambar tidur</b>
        <span>Gambar panjang hasil Share dari Huawei Health</span>
      </button>
      <div class="b-label">Caranya</div>
      <div class="shell" data-test="steps">
        <div class="b-core">
          <ol class="bu-steps">
            <li><span>Buka <b>Huawei Health</b> → <b>Tidur</b> → tidur semalem.</span></li>
            <li><span>Tap <b>Share</b> → simpen gambarnya ke <b>Foto</b>.</span></li>
            <li><span>Balik ke sini, pilih gambarnya. Angkanya dibaca otomatis.</span></li>
          </ol>
        </div>
      </div>
      <div class="bf-note"><PhEyeSlash :size="15" />Gambarnya nggak disimpen, cuma angkanya.</div>
    </template>

    <div v-else class="bu-grid">
      <div class="bu-imgcol">
        <div class="b-core bu-strip">
          <span class="bu-thumb"><img v-if="url" :src="url" alt="" /></span>
          <div class="t"><b>{{ fileName }}</b><small>Gambar panjang dari Huawei Health</small></div>
          <button type="button" class="bu-lk" data-test="toggle-img" @click="showImg = !showImg">{{ showImg ? 'Tutup' : 'Liat gambar' }}</button>
        </div>
        <div class="bu-imgfull" :class="{ show: showImg }" data-test="imgfull"><img v-if="url" :src="url" alt="Gambar tidur" /></div>
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
          <div class="bf-group"><span>Waktu tidur</span></div>
          <div class="bu-sk2"><div class="bu-sk bs-span2" /><div class="bu-sk" /><div class="bu-sk" /></div>
          <div class="bf-group"><span>Lama tidur</span></div>
          <div class="bu-sk4"><div v-for="n in 4" :key="n" class="bu-sk big" /></div>
          <div class="bf-group"><span>Lainnya</span></div>
          <div class="bu-sk4"><div v-for="n in 4" :key="n" class="bu-sk" /></div>
        </template>

        <template v-else-if="stage === 'fail'">
          <div class="b-core bu-fail" data-test="fail">
            <div class="em">😕</div>
            <h3>{{ blocked ? 'Belum bisa baca gambar' : 'Nggak kebaca' }}</h3>
            <p>{{ failText }}</p>
            <div class="bu-btnrow">
              <button v-if="canRetry" type="button" class="pill" data-test="reread" @click="reread"><PhArrowsClockwise :size="17" weight="bold" />&nbsp;Baca ulang</button>
              <button v-if="!blocked" type="button" class="pill" :class="{ ghost: canRetry }" data-test="another" @click="another"><PhImage :size="17" />&nbsp;Gambar lain</button>
              <button type="button" class="pill ghost" :style="manualWide ? 'grid-column: span 2' : ''" data-test="manual" @click="$emit('manual')"><PhPencilSimple :size="17" />&nbsp;Isi manual</button>
            </div>
          </div>
          <div class="bf-note"><PhEyeSlash :size="15" />Gambarnya nggak disimpen, cuma angkanya.</div>
        </template>

        <BadanSleepForm v-else-if="result" ref="form" :key="reads" mode="result" :initial="result" :check="result.check ?? []" @done="(m) => $emit('done', m)" @open="(i) => $emit('open', i)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { PhArrowsClockwise, PhEyeSlash, PhImage, PhMoon, PhPencilSimple } from '@phosphor-icons/vue'
import BadanSleepForm from '@/components/badan/BadanSleepForm.vue'
import { resizeToWidth } from '@/lib/imageResize.js'
import { showToast } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/**
 * Upload gambar tidur Huawei Health → dibaca server → form hasil. Keadaan: pick | load | result | fail.
 * Gambarnya cuma object URL di memori (dicabut pas ditutup), nggak disimpen di mana-mana.
 * Baca ulang = kirim lagi blob yang SAMA.
 */
const emit = defineEmits(['done', 'open', 'manual', 'stage'])
defineExpose({ get busy() { return form.value?.busy ?? false } })

const FAIL_HINT = 'Pastiin gambarnya hasil Share dari Huawei Health (gambar panjang), bukan foto layar yang kepotong.'

const store = useBadanStore()
const fileInput = ref(null)
const form = ref(null)
const stage = ref('pick')
const url = ref('')
const fileName = ref('Gambar tidur')
const showImg = ref(false)
const reads = ref(0)
const result = ref(null)
const failStatus = ref(0)
const failMessage = ref('')
let blob = null
let token = 0

watch(stage, (s) => emit('stage', s), { immediate: true })

/** Jatah abis / fitur belum disetel: baca ulang atau ganti gambar sama-sama percuma. */
const blocked = computed(() => failStatus.value === 429 || failStatus.value === 503)
/** Gambarnya ditolak (422): kirim ulang blob yang sama percuma. */
const canRetry = computed(() => !blocked.value && failStatus.value !== 422)
const manualWide = computed(() => blocked.value || canRetry.value)
/** 502 = server udah nyoba baca tapi gagal → petunjuk dari mockup; sisanya pesan server apa adanya. */
const failText = computed(() => (failStatus.value === 502 || !failMessage.value ? FAIL_HINT : failMessage.value))

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
  fileName.value = file.name || 'Gambar tidur'
  showImg.value = false
  const resized = await resizeToWidth(file, 1080)
  if (mine !== token) return
  blob = resized
  revoke()
  url.value = URL.createObjectURL(blob)
  await run(mine)
}

async function run(mine = ++token) {
  stage.value = 'load'
  try {
    const res = await store.scanSleep(blob)
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

function another() {
  token += 1
  revoke()
  blob = null
  result.value = null
  stage.value = 'pick'
}

async function reread() {
  if (!blob) return
  reads.value += 1
  await run()
  if (stage.value !== 'result') return
  const n = result.value?.check?.length ?? 0
  showToast(n ? `Dibaca ulang · tinggal ${n} angka yang perlu dicek` : 'Dibaca ulang · semua angka udah jelas')
}

onBeforeUnmount(() => {
  token += 1
  revoke()
})
</script>
