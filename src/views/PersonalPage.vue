<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page p-page" :class="{ wide }">
        <PersonalGate>
          <template v-if="!wide">
            <div class="p-toprow">
              <button type="button" class="p-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Semua menu</button>
              <button type="button" class="p-lockpill" data-test="lock" @click="lockNow"><PhLockSimple :size="15" weight="bold" />Kunci</button>
            </div>
            <span class="eyebrow rise"><span class="dot" />Pribadi</span>
            <h1 class="h1 rise p-h1" style="--i: 1">Data Pribadi.<span class="p-sub">Tap baris mana aja buat nyalin.</span></h1>
            <span class="p-open"><PhLockSimpleOpen :size="14" weight="fill" />Kebuka · kekunci pas lo pindah halaman</span>

            <div class="p-seg" data-test="seg">
              <button v-for="[key, label] in TABS" :key="key" type="button" :class="{ on: tab === key }" :data-test="`tab-${key}`" @click="tab = key">
                {{ label }}<span v-if="key === 'dokumen' && hasDue" class="p-dot" data-test="due-dot" />
              </button>
            </div>
            <PersonalBio v-if="tab === 'bio'" :bio="bio" @edit="editBio" />
            <PersonalDocs v-else-if="tab === 'dokumen'" :documents="store.documents" @open="openDoc" />
            <PersonalAddresses v-else :addresses="store.addresses" @edit="editAddress" />
          </template>

          <template v-else>
            <div class="p-pchead">
              <div>
                <span class="eyebrow"><span class="dot" />Pribadi</span>
                <h1 class="h1 p-h1">Data Pribadi.<span class="p-pcsub">tap buat nyalin</span></h1>
              </div>
              <div class="p-pcact">
                <span class="p-open"><PhLockSimpleOpen :size="14" weight="fill" />Kebuka</span>
                <button type="button" class="pill ghost" data-test="lock" @click="lockNow"><PhLockSimple :size="16" weight="bold" />&nbsp;Kunci</button>
                <button type="button" class="pill ghost" data-test="add-address" @click="addAddress">+ Alamat</button>
                <button type="button" class="pill" data-test="add-doc" @click="addDoc">Tambah dokumen <span class="ic"><PhPlus :size="17" weight="bold" /></span></button>
              </div>
            </div>
            <div v-if="xwide" class="p-grid p-grid3" data-test="cols-3">
              <div><PersonalBio :bio="bio" @edit="editBio" /></div>
              <div><PersonalDocs :documents="store.documents" @open="openDoc" /></div>
              <div><PersonalAddresses :addresses="store.addresses" @edit="editAddress" /></div>
            </div>
            <div v-else class="p-grid p-grid2" data-test="cols-2">
              <div><PersonalDocs :documents="store.documents" @open="openDoc" /></div>
              <div><PersonalBio :bio="bio" @edit="editBio" /><PersonalAddresses :addresses="store.addresses" @edit="editAddress" /></div>
            </div>
          </template>
          <PersonalPanel v-if="wide" :open="panel.open" :view="panel.view" :id="panel.id" :form-key="panel.key" @close="closePanel" @edit="openPanel('doc-edit', panel.id)" @done="onPanelDone" />
        </PersonalGate>
      </div>

      <button v-if="showFab" slot="fixed" type="button" class="p-fab" data-test="fab" @click="tab === 'dokumen' ? addDoc() : addAddress()">
        {{ tab === 'dokumen' ? 'Dokumen' : 'Alamat' }} <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, provide, reactive, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewDidEnter, onIonViewDidLeave, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhLockSimple, PhLockSimpleOpen, PhPlus } from '@phosphor-icons/vue'
import { useRoute, useRouter } from 'vue-router'
import '@/components/personal.css'
import PersonalAddresses from '@/components/PersonalAddresses.vue'
import PersonalBio from '@/components/PersonalBio.vue'
import PersonalDocs from '@/components/PersonalDocs.vue'
import PersonalGate from '@/components/PersonalGate.vue'
import PersonalPanel from '@/components/PersonalPanel.vue'
import { useMedia } from '@/lib/media.js'
import { dueList } from '@/lib/personal.js'
import { showToast } from '@/lib/personalForm.js'
import { PERSONAL_BASE } from '@/lib/personalLock.js'
import { usePersonalStore } from '@/stores/personal.js'

const TABS = [['bio', 'Biodata'], ['dokumen', 'Dokumen'], ['alamat', 'Alamat']]
const store = usePersonalStore()
const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 1100px)')
const xwide = useMedia('(min-width: 1600px)')
const tab = ref('dokumen')

// Ionic nyimpen halaman yang ditinggal: keyboard layar PIN cuma boleh nangkep pas halaman ini yang keliatan.
const active = ref(true)
provide('pageActive', active)
onIonViewDidEnter(() => (active.value = true))
onIonViewDidLeave(() => (active.value = false))

const bio = computed(() => store.bio ?? { fields: {}, extra: [] })
const hasDue = computed(() => dueList(store.documents).length > 0)
const showFab = computed(() => !wide.value && store.unlocked && store.today !== null && tab.value !== 'bio')

const route = useRoute()
const router = useRouter()

/* ---- detail & form: HP = halaman anak, PC = panel geser ---- */
const panel = reactive({ open: false, view: 'doc', id: null, key: 0 })
function openPanel(view, id = null) {
  panel.view = view
  panel.id = id
  panel.key += 1
  panel.open = true
}
const closePanel = () => (panel.open = false)
async function onPanelDone(message, next) {
  if (next?.docId) openPanel('doc', next.docId)
  else closePanel()
  await showToast(message)
}
const open = (view, id, path) => (wide.value ? openPanel(view, id) : ionRouter.push(`${PERSONAL_BASE}/${path}`))
const openDoc = (id) => open('doc', id, `dokumen/${id}`)
const addDoc = () => open('doc-new', null, 'dokumen/baru')
const addAddress = () => {
  tab.value = 'alamat'
  open('addr-new', null, 'alamat/baru')
}
const editAddress = (id) => open('addr-edit', id, `alamat/${id}/ubah`)
const editBio = () => open('bio', null, 'biodata/ubah')
// Dikunci (dari mana pun) → panel nggak boleh nongol lagi sendiri pas dibuka ulang.
watch(() => store.unlocked, (unlocked) => !unlocked && closePanel())

/**
 * Link dari notif / Beranda (?dokumen=<id>) dan lemparan dari halaman anak di layar lebar (?panel=<view>&id=<id>).
 * Baru dijalanin abis kebuka & datanya ke-muat (kekunci → nunggu PIN dulu). Abis dipakai query dibuang.
 */
function followLink() {
  if (store.today === null || route.path !== PERSONAL_BASE) return
  const { dokumen, panel: wanted, id, ...rest } = route.query
  if (dokumen === undefined && wanted === undefined) return
  router.replace({ path: PERSONAL_BASE, query: rest })
  const docId = dokumen !== undefined ? dokumen : id
  const view = dokumen !== undefined ? 'doc' : wanted
  const num = Number(docId)
  if (view === 'doc' || view === 'doc-edit') {
    if (!Number.isInteger(num) || !store.documents.some((d) => d.id === num)) return
  } else if (view === 'addr-edit') {
    if (!Number.isInteger(num) || !store.addresses.some((a) => a.id === num)) return
  }
  if (!['doc', 'doc-new', 'doc-edit', 'addr-new', 'addr-edit', 'bio'].includes(view)) return
  const needsId = ['doc', 'doc-edit', 'addr-edit'].includes(view)
  if (wide.value) openPanel(view, needsId ? num : null)
  else if (view === 'doc') ionRouter.push(`${PERSONAL_BASE}/dokumen/${num}`)
}
watch([() => store.today, () => route.query, () => route.path], followLink, { immediate: true })

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu', 'back', 'replace'))

async function lockNow() {
  await store.lock()
  await showToast('Data Pribadi dikunci 🔒')
}
</script>

<style scoped>
.p-page { padding-bottom: 130px; }
.p-page:not(.wide) { max-width: 620px; }
.p-toprow { display: flex; align-items: center; justify-content: space-between; }
.p-back { display: flex; align-items: center; gap: 4px; width: fit-content; margin: 0 0 12px -6px; padding: 6px 12px 6px 6px; border: 0; border-radius: 99px;
  background: transparent; color: var(--muted); font: 600 14px var(--ion-font-family); cursor: pointer; }
.p-back:active { background: var(--soft); }
.p-lockpill { height: 34px; padding: 0 12px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 12.5px var(--ion-font-family); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 12px; }
.p-h1 { margin-bottom: 8px; }
.p-sub { display: block; font-size: 15px; letter-spacing: -0.01em; margin-top: 8px; }
.p-open { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 99px; background: rgba(43, 168, 100, .12); color: var(--green); font-size: 11.5px; font-weight: 700; }
.p-seg { display: flex; padding: 4px; border-radius: 99px; background: var(--soft); margin: 16px 0 4px; }
.p-seg button { flex: 1; height: 38px; border: 0; border-radius: 99px; background: transparent; font: 700 13.5px var(--ion-font-family); color: var(--muted); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.p-seg button.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); }
.p-dot { width: 7px; height: 7px; border-radius: 99px; background: var(--amber); }

.p-fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 14px 30px -12px rgba(0, 0, 0, .5); cursor: pointer; transition: transform .2s var(--spring); }
.p-fab:active { transform: scale(.96); }
.p-fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .p-fab { bottom: 28px; right: 36px; } }

.p-pchead { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.p-pchead .h1 { margin-top: 10px; }
.p-pcsub { display: inline; margin-left: .25em; }
.p-pcact { display: flex; gap: 8px; align-items: center; flex-shrink: 0; margin-bottom: 30px; }
.p-pcact .pill { height: 44px; font-size: 14px; }
.p-grid { display: grid; gap: 24px; margin-top: 6px; align-items: start; }
.p-grid3 { grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr); }
.p-grid2 { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
.p-grid > div > :first-child { margin-top: 0; }
.p-grid :deep(.p-glabel:first-child) { margin-top: 0; }
</style>
