<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Gym</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Gym</span>
        <h1 class="h1 rise" style="--i: 1">Atur program.<span>Tahan ⠿ &amp; geser buat ngurutin. Tap gerakan buat atur istirahat.</span></h1>

        <p v-if="failed && !data" class="gy-fail" data-test="failed">Nggak bisa muat programnya. <button type="button" @click="load">Coba lagi</button></p>
        <p v-else-if="!data" class="gy-wait" data-test="wait">Bentar ya…</p>
        <template v-else>
          <div v-if="!wide" class="gy-pseg rise" style="--i: 2" role="tablist">
            <button v-for="k in PROGRAMS" :key="k" type="button" role="tab" :class="{ on: prog === k }" :aria-selected="String(prog === k)" :data-prog="k" @click="prog = k"><span>{{ PROGRAM_EMOJI[k] }}</span>{{ PROGRAM_LABEL[k] }}</button>
          </div>
          <div class="gy-pcols rise" style="--i: 3">
            <div v-for="k in shown" :key="k" class="gy-pcol" :data-col="k">
              <div class="shell">
                <div class="gy-core">
                  <div class="gy-pch"><span class="pem" :style="{ '--t': PROGRAM_TINT[k] }">{{ PROGRAM_EMOJI[k] }}</span>{{ PROGRAM_LABEL[k] }}</div>
                  <ion-reorder-group :disabled="false" @ionReorderEnd="(ev) => reorder(k, ev)">
                    <div v-for="x in rowsOf(k)" :key="x.id" class="gy-prow">
                      <ion-reorder aria-label="Tahan & geser buat ngurutin"><PhDotsSixVertical :size="20" weight="bold" /></ion-reorder>
                      <button type="button" class="main" data-test="prow" @click="editing = { key: k, id: x.id }">
                        <span class="grow"><b>{{ x.name }}</b><small>{{ subOf(x) }}</small></span>
                        <span class="go"><PhCaretRight :size="16" weight="bold" /></span>
                      </button>
                    </div>
                  </ion-reorder-group>
                  <p v-if="!rowsOf(k).length" class="gy-pempty" data-test="empty-col">Belum ada gerakan di {{ PROGRAM_LABEL[k] }}.</p>
                  <button type="button" class="gl-xrow new gy-padd" data-test="add-ex" @click="adding = k">
                    <span class="pl"><PhPlus :size="16" weight="bold" /></span>
                    <span class="grow"><b>Tambah gerakan</b></span>
                  </button>
                </div>
              </div>
              <div v-if="k === 'lower'" class="gy-pnote" data-test="lower-note"><span>📋</span><span>Lower awalnya salinan Leg. Tambah/hapus/urutin di sini nggak ngubah Leg.</span></div>
            </div>
          </div>
          <div class="gy-note">Ubah program nggak ngubah riwayat. Patokan angka nempel ke gerakan, bukan ke hari.</div>
        </template>
      </div>

      <GymExerciseSheet :open="!!editing" :wide="wide" :exercise="editingEx" :program="shownKey" @close="editing = null" @remove="removeEditing" />
      <GymAddExerciseSheet :open="!!adding" :wide="wide" mode="program" :program="shownAdd" :programs="data?.programs ?? []" :exercises="store.exercises" :exclude="addExclude" @close="adding = null" @add="addTo" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, IonReorder, IonReorderGroup, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhCaretRight, PhDotsSixVertical, PhPlus } from '@phosphor-icons/vue'
import GymAddExerciseSheet from '@/components/gym/GymAddExerciseSheet.vue'
import GymExerciseSheet from '@/components/gym/GymExerciseSheet.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymReport.css'
import '@/components/gym/gymChart.css'
import { PROGRAMS, PROGRAM_EMOJI, PROGRAM_LABEL, PROGRAM_TINT, kgText, restText } from '@/lib/gym.js'
import { useMedia } from '@/lib/media.js'
import { showToast } from '@/lib/personalForm.js'
import { useGymStore } from '@/stores/gym.js'

const BASE = '/tabs/menu/gym'
const store = useGymStore()
const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 1100px)')

const prog = ref('push')
const editing = ref(null)
const adding = ref(null)
const failed = ref(false)
// Urutan yang lagi disimpen (langsung keliatan, dibuang abis server jawab / balik kalau gagal).
const local = ref({})
let chain = Promise.resolve()
const ver = {}

const data = computed(() => store.data)
const shown = computed(() => (wide.value ? PROGRAMS : [prog.value]))
const idsOf = (k) => local.value[k] ?? data.value?.programs.find((p) => p.key === k)?.exerciseIds ?? []
const rowsOf = (k) => {
  const byId = new Map(store.exercises.map((x) => [x.id, x]))
  return idsOf(k).map((id) => byId.get(id)).filter(Boolean)
}
const subOf = (x) => `istirahat ${restText(x.restSec)} · ±${kgText(x.step)} kg${x.dumbbell ? ' · dumbbell' : ''}`

// Nama latihan di sheet tetep ada pas animasi nutup.
const shownKey = computed(() => editing.value?.key ?? prog.value)
const shownAdd = computed(() => adding.value ?? prog.value)
const editingEx = computed(() => (editing.value ? store.exercises.find((x) => x.id === editing.value.id) ?? null : null))
const addExclude = computed(() => (adding.value ? idsOf(adding.value) : []))

async function load() {
  failed.value = false
  try {
    await store.load()
  } catch {
    failed.value = true
  }
}

/** Simpen urutan / isi satu program. Gagal → balik ke yang lama + toast pesan server. Disusun antri biar nggak tabrakan. */
function save(key, ids, okText) {
  const mine = (ver[key] = (ver[key] ?? 0) + 1)
  local.value = { ...local.value, [key]: ids }
  const run = async () => {
    try {
      await store.saveProgram(key, ids)
      if (okText) showToast(okText)
    } catch (e) {
      showToast(e?.status ? e.message : 'Belum ada sinyal. Programnya belum kesimpen, coba lagi.')
    } finally {
      // Cuma yang terakhir yang boleh nutup (ada simpenan yang lebih baru → urutannya masih dipake).
      if (ver[key] === mine) {
        const rest = { ...local.value }
        delete rest[key]
        local.value = rest
      }
    }
  }
  chain = chain.then(run, run)
  return chain
}

function reorder(key, ev) {
  const { from, to, complete } = ev.detail
  const ids = [...idsOf(key)]
  if (from !== to && from >= 0 && from < ids.length) {
    const [moved] = ids.splice(from, 1)
    ids.splice(Math.min(to, ids.length), 0, moved)
    save(key, ids)
  }
  complete()
}

function removeEditing() {
  const e = editing.value
  if (!e) return
  editing.value = null
  save(e.key, idsOf(e.key).filter((id) => id !== e.id), `Dihapus dari ${PROGRAM_LABEL[e.key]}`)
}

function addTo(x) {
  const key = adding.value
  adding.value = null
  if (!key) return
  const ids = idsOf(key)
  if (ids.includes(x.id)) return
  save(key, [...ids, x.id], 'Kesimpen ✓')
}

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(BASE, 'back', 'replace'))
load()
</script>
