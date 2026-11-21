<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Gym</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Gym</span>
        <h1 class="h1 rise" style="--i: 1">Grafik gerakan.<span>Lagi naik, datar, atau turun?</span></h1>

        <p v-if="failed" class="gy-fail" data-test="failed">Nggak bisa muat grafiknya. <button type="button" @click="reload">Coba lagi</button></p>
        <p v-else-if="!ready" class="gy-wait" data-test="wait">Bentar ya…</p>
        <div v-else-if="!exercises.length" class="shell"><div class="gy-core gy-empty" data-test="no-ex"><div class="em">📈</div><h2>Belum ada gerakan</h2><p>Mulai satu sesi di halaman Gym, nanti grafiknya muncul di sini.</p></div></div>
        <div v-else class="gy-cgrid">
          <section>
            <button type="button" class="gy-expick rise" :style="{ '--t': tint }" data-test="pick-btn" @click="pickOpen = true">
              <span class="pem">{{ emoji }}</span>
              <span class="grow"><small>{{ progText || 'gerakan tambahan' }}</small><b>{{ shownName }}</b></span>
              <span class="go"><PhCaretDown :size="20" weight="bold" /></span>
            </button>

            <p v-if="gone" class="gy-fail" data-test="gone">Gerakannya nggak ketemu. Pilih gerakan lain di atas.</p>
            <div v-else-if="!chart" class="gy-wait" data-test="wait">Bentar ya…</div>
            <div v-else-if="!chart.points.length" class="shell rise" style="--i: 1; margin-top: 12px"><div class="gy-core gy-empty" data-test="empty"><div class="em">📈</div><h2>Belum ada data</h2><p>Gerakan ini belum pernah dicentang di sesi yang udah selesai. Abis latihan, grafiknya muncul di sini.</p></div></div>
            <div v-else class="shell rise" style="--i: 1; margin-top: 12px">
              <div class="gy-core gy-pad">
                <div class="gy-seg" role="tablist">
                  <button type="button" role="tab" :class="{ on: mode === 'kg' }" :aria-selected="String(mode === 'kg')" data-test="mode-kg" @click="mode = 'kg'">Beban terberat</button>
                  <button type="button" role="tab" :class="{ on: mode === 'orm' }" :aria-selected="String(mode === 'orm')" data-test="mode-orm" @click="mode = 'orm'">1RM</button>
                </div>
                <div v-if="chart.flat >= FLAT_MIN" class="gy-flatrow"><span class="gy-chip amber" data-test="flat">Datar {{ chart.flat }} sesi terakhir</span></div>
                <GymChart :points="points" :mode="mode" :wide="wide" />
                <div class="gy-cnote" data-test="note">
                  <span class="em">{{ mode === 'orm' ? '🧮' : '📈' }}</span>
                  <span v-if="mode === 'orm'"><b>1RM</b> = perkiraan beban maksimal yang bisa lo angkat <b>sekali</b>. Dihitung dari set terberat, jadi <b>22,5 × 10</b> dan <b>25 × 7</b> bisa dibandingin. Garis naik = lo makin kuat.<button type="button" class="gy-info" aria-label="Apa itu 1RM?" data-test="note-info" @click="term = '1rm'">?</button></span>
                  <span v-else>Tiap titik = <b>set terberat</b> di sesi itu (beban × reps). Garis naik pelan-pelan = progressive overload.<button type="button" class="gy-info" aria-label="Apa itu progressive overload?" data-test="note-info" @click="term = 'po'">?</button></span>
                </div>
              </div>
            </div>
          </section>
          <section v-if="chart && chart.points.length">
            <div class="gy-label rise" style="--i: 2"><span>Rekor</span></div>
            <div class="shell rise" style="--i: 2">
              <div class="gy-core gy-rec" data-test="record">
                <div><div class="k">Beban terberat</div><div class="v">{{ setText(chart.record.best) }}</div><div class="s">{{ dShort(chart.record.bestOn) }}</div></div>
                <div><div class="k">1RM tertinggi <button type="button" class="gy-info" aria-label="Apa itu 1RM?" @click="term = '1rm'">?</button></div><div class="v">{{ kgText(chart.record.e1rm) }}<small> kg</small></div><div class="s">dari {{ setText(chart.record.e1rmFrom) }}</div></div>
              </div>
            </div>
            <div class="gy-label rise" style="--i: 3"><span>Tiap sesi</span><small>{{ chart.points.length }} sesi</small></div>
            <div class="shell rise" style="--i: 3">
              <div class="gy-core gy-slist">
                <div v-for="p in rows" :key="`${p.sessionId}-${p.on}`" class="srw" data-test="sess-row">
                  <span class="d">{{ dShort(p.on) }}</span>
                  <span class="s">{{ p.sets.map(setText).join(' · ') }}</span>
                  <span class="v">{{ mode === 'orm' ? `${kgText(p.e1rm)} kg` : setText(p.best) }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <GymExercisePicker :open="pickOpen" :wide="wide" :programs="programs" :exercises="exercises" :current-id="id" @close="pickOpen = false" @pick="choose" />
      <GymInfoSheet :term="term" :wide="wide" @close="term = null" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { PhCaretDown, PhCaretLeft } from '@phosphor-icons/vue'
import { useRoute } from 'vue-router'
import GymChart from '@/components/gym/GymChart.vue'
import GymExercisePicker from '@/components/gym/GymExercisePicker.vue'
import GymInfoSheet from '@/components/gym/GymInfoSheet.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymReport.css'
import '@/components/gym/gymChart.css'
import { dShort } from '@/lib/badanView.js'
import { FLAT_MIN, PROGRAMS, PROGRAM_EMOJI, PROGRAM_LABEL, PROGRAM_TINT, kgText, setText } from '@/lib/gym.js'
import { useMedia } from '@/lib/media.js'
import { useGymStore } from '@/stores/gym.js'

const BASE = '/tabs/menu/gym'
const store = useGymStore()
const ionRouter = useIonRouter()
const route = useRoute()
const wide = useMedia('(min-width: 1100px)')

const id = ref(null)
const chart = ref(null)
const mode = ref('kg')
const ready = ref(false)
const failed = ref(false)
const gone = ref(false)
const pickOpen = ref(false)
const term = ref(null)
let seq = 0

const exercises = computed(() => store.exercises)
const programs = computed(() => store.data?.programs ?? [])
const nameOf = (x) => exercises.value.find((e) => e.id === x)?.name ?? ''
const shownName = computed(() => chart.value?.exercise?.name ?? nameOf(id.value))
// Program yang punya gerakan ini (urutan Push, Pull, Leg, Upper, Lower).
const progKeys = computed(() => PROGRAMS.filter((k) => programs.value.find((p) => p.key === k)?.exerciseIds.includes(id.value)))
const progText = computed(() => progKeys.value.map((k) => PROGRAM_LABEL[k]).join(' · '))
const emoji = computed(() => PROGRAM_EMOJI[progKeys.value[0] ?? 'push'])
const tint = computed(() => PROGRAM_TINT[progKeys.value[0] ?? 'push'])
const points = computed(() => chart.value?.points ?? [])
const rows = computed(() => [...points.value].reverse())

/** Gerakan awal: ?gerakan= → gerakan di kartu mini Gym → gerakan pertama yang punya riwayat → pertama. */
function firstId() {
  const q = Number(route.query.gerakan)
  if (route.query.gerakan && Number.isInteger(q) && q > 0) return q
  const mini = store.data?.mini?.exerciseId
  if (mini != null) return mini
  const list = exercises.value
  return (list.find((x) => x.last) ?? list[0])?.id ?? null
}

async function show(next) {
  id.value = next
  chart.value = null
  gone.value = false
  failed.value = false
  if (next == null) return
  const mine = ++seq
  try {
    const res = await store.exerciseChart(next)
    if (mine === seq) chart.value = res
  } catch (e) {
    if (mine !== seq) return
    if (e?.status === 404) gone.value = true
    else failed.value = true
  }
}

async function reload() {
  failed.value = false
  ready.value = false
  try {
    if (!store.data) await store.load()
  } catch {
    if (!exercises.value.length) {
      failed.value = true
      return
    }
  }
  ready.value = true
  await show(id.value ?? firstId())
}

function choose(x) {
  pickOpen.value = false
  if (x !== id.value) show(x)
}

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(BASE, 'back', 'replace'))
reload()
</script>
