<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page" :class="wide ? ['canvas', 'fill', { 'fill-grow': view === 'month' }] : 'narrow'">
        <PageHeader eyebrow="Agenda" bell />
        <div class="head">
          <h1 class="h1 rise" style="--i: 1">{{ titleMain }}<span class="h1-sub">{{ titleSub }}</span></h1>
          <div class="ctrls rise" style="--i: 2">
            <div class="seg" role="tablist" aria-label="Tampilan">
              <span class="ind" :style="{ transform: `translateX(${VIEWS.indexOf(view) * 100}%)` }" />
              <button v-for="v in VIEWS" :key="v" type="button" role="tab" :class="{ on: view === v }" :aria-selected="view === v" :data-view="v" @click="view = v">{{ VIEW_NAMES[v] }}</button>
            </div>
            <button v-if="offToday" type="button" class="pillbtn" data-test="today" @click="backToToday">Hari ini</button>
            <button v-if="wide && view !== 'day'" type="button" class="pillbtn" data-test="drawer-top" @click="openDrawer">📥 Kapan-kapan <span class="n">{{ store.undated.length }}</span></button>
            <button v-if="wide" type="button" class="addbtn" data-test="add-top" @click="add">Tambah <span class="ic"><PhPlus :size="17" weight="bold" /></span></button>
          </div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="sel">
          <!-- HARI -->
          <template v-if="view === 'day'">
            <div v-if="wide" class="daywide">
              <div class="aside-col" data-test="aside">
                <MonthCalendar compact :month="month" :selected="sel" :today="today" @pick="sel = $event" @shift="shiftMonth" />
                <div class="lbl">To-do <small>{{ selTodos.length ? `${selTodos.filter((t) => t.done).length}/${selTodos.length} beres` : '' }}</small></div>
                <div class="shell">
                  <div class="core todo-list">
                    <AgendaTodoRow v-for="t in selTodos" :key="`${t.id}:${t.occurrence}`" :row="t" @edit="editTodo" @error="showError" />
                    <div v-if="!selTodos.length" class="todo-empty">Belum ada to-do.</div>
                  </div>
                </div>
                <AgendaBillSection v-if="selBills.length" :bills="selBills" @error="showError" />
                <div class="lbl">📥 Kapan-kapan <small>{{ store.undated.length }}</small></div>
                <div class="shell"><div class="core flat"><KapanKapanList :items="store.undated" :today="today" @edit="editTodo" /></div></div>
              </div>
              <AgendaDayTimeline :day="store.day(sel)" :date="sel" :now-minute="sel === today ? nowMinute : null" @event="openEvent" />
            </div>
            <template v-else>
              <div class="strip-head">
                <b>{{ stripLabel }}</b>
                <span class="arrows">
                  <button type="button" aria-label="7 hari sebelumnya" data-test="prev" @click="shiftStrip(-7)"><PhCaretLeft :size="15" /></button>
                  <button type="button" aria-label="7 hari berikutnya" data-test="next" @click="shiftStrip(7)"><PhCaretRight :size="15" /></button>
                </span>
              </div>
              <div class="strip" data-test="strip">
                <button v-for="date in strip" :key="date" type="button" class="dpill" :class="{ on: date === sel, today: date === today }" :data-day="date" @click="sel = date">
                  <small>{{ HR[weekdayOf(date)] }}</small><b>{{ Number(date.slice(8)) }}</b>
                  <span class="dots"><i v-if="store.day(date).events.length" /><i v-if="store.day(date).todos.some((t) => !t.done)" class="tdot" /><i v-if="store.day(date).bills.some((b) => b.status !== 'paid')" class="bdot" /></span>
                </button>
              </div>
              <AgendaDayList :day="store.day(sel)" :drawer="sel === today" :undated-count="store.undated.length" @event="openEvent" @edit-todo="editTodo" @drawer="openDrawer" @error="showError" />
            </template>
          </template>

          <!-- MINGGU -->
          <template v-else-if="view === 'week'">
            <div class="strip-head">
              <b>{{ wide ? '' : 'Seminggu' }}</b>
              <span class="arrows">
                <button type="button" aria-label="Minggu sebelumnya" data-test="prev" @click="shiftDays(-7)"><PhCaretLeft :size="15" /></button>
                <button type="button" aria-label="Minggu berikutnya" data-test="next" @click="shiftDays(7)"><PhCaretRight :size="15" /></button>
              </span>
            </div>
            <AgendaWeek :dates="week" :today="today" :wide="wide" :now-minute="nowMinute" @go-day="goDay" @event="openEvent" @error="showError" />
            <button v-if="!wide" type="button" class="drawer" data-test="drawer" @click="openDrawer">
              <span class="ic">📥</span><span class="grow"><b>Kapan-kapan</b><span>To-do yang belum ada tanggalnya</span></span><span class="n">{{ store.undated.length }}</span>
            </button>
          </template>

          <!-- BULAN -->
          <template v-else>
            <AgendaMonthBig v-if="wide" :month="month" :today="today" @go-day="goDay" @shift="shiftMonth" />
            <template v-else>
              <div class="month-wrap"><MonthCalendar :month="month" :selected="sel" :today="today" @pick="sel = $event" @shift="shiftMonth" /></div>
              <div class="picked">{{ dayTitle(sel) }}</div>
              <AgendaDayList :day="store.day(sel)" :drawer="sel === today" :undated-count="store.undated.length" @event="openEvent" @edit-todo="editTodo" @drawer="openDrawer" @error="showError" />
            </template>
          </template>
        </template>
      </div>

      <button v-if="!wide" slot="fixed" type="button" class="fab" data-test="add" @click="add">Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
    </ion-content>

    <AgendaSheet :open="sheetOpen" :wide="dialog" :big="sheetKind === 'form'" :label="SHEET_LABELS[sheetKind]" @close="sheetOpen = false">
      <template v-if="sheetKind === 'drawer'">
        <h3 class="sh-title">📥 Kapan-kapan</h3>
        <p class="sh-sub">{{ store.undated.length }} to-do belum ada tanggalnya. Centang kalau udah, atau jadwalin.</p>
        <KapanKapanList :items="store.undated" :today="today" @edit="editTodo" />
      </template>
      <EventDetail v-else-if="sheetKind === 'event' && detail" :key="`${detail.id}:${detail.occurrence}`" :event="detail" @edit="editEvent" @deleted="sheetOpen = false" />
      <!-- iPad & PC: tambah / ubah di dialog. HP pakai halaman penuh (keyboard iOS). -->
      <div v-else-if="sheetKind === 'form'" data-test="form-dialog">
        <AgendaForm :key="formKey" :initial-kind="form.kind" :item="form.item" :date="form.date" :occurrence="form.occurrence" @saved="sheetOpen = false" @deleted="sheetOpen = false" />
      </div>
    </AgendaSheet>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhCaretRight, PhPlus } from '@phosphor-icons/vue'
import AgendaBillSection from '@/components/AgendaBillSection.vue'
import AgendaDayList from '@/components/AgendaDayList.vue'
import AgendaDayTimeline from '@/components/AgendaDayTimeline.vue'
import AgendaForm from '@/components/AgendaForm.vue'
import AgendaMonthBig from '@/components/AgendaMonthBig.vue'
import AgendaSheet from '@/components/AgendaSheet.vue'
import AgendaTodoRow from '@/components/AgendaTodoRow.vue'
import AgendaWeek from '@/components/AgendaWeek.vue'
import EventDetail from '@/components/EventDetail.vue'
import KapanKapanList from '@/components/KapanKapanList.vue'
import MonthCalendar from '@/components/MonthCalendar.vue'
import PageHeader from '@/components/PageHeader.vue'
import { addDays, addMonths, BLN, dayTitle, HR, localToday, monthName, monthStart, rangeFor, stripAround, weekDates, weekdayOf, weekStart } from '@/lib/agenda.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAgendaStore } from '@/stores/agenda.js'

const VIEWS = ['day', 'week', 'month']
const VIEW_NAMES = { day: 'Hari', week: 'Minggu', month: 'Bulan' }
const SHEET_LABELS = { drawer: 'Kapan-kapan', event: 'Detail acara', form: 'Tambah / ubah', '': '' }

const route = useRoute()
const router = useRouter()
const ionRouter = useIonRouter()
const store = useAgendaStore()
/** iPad landscape / Mac: tampilan full. iPad tegak ke atas: sheet jadi dialog. */
const wide = useMedia('(min-width: 1100px)')
const dialog = useMedia('(min-width: 768px)')

const view = ref('day')
const sel = ref(null)
const error = ref('')
const sheetOpen = ref(false)
const sheetKind = ref('')
const detail = ref(null)
/** Isi dialog form (iPad & PC). formKey bikin form baru tiap dibuka. */
const form = ref({ kind: 'todo', item: null, date: '', occurrence: null })
const formKey = ref(0)

const today = computed(() => store.today ?? localToday())
const selTodos = computed(() => (sel.value ? store.day(sel.value).todos : []))
const selBills = computed(() => (sel.value ? store.day(sel.value).bills : []))

/** Menit sekarang (jam lokal) buat garis merah di tampilan jam-jaman — disegerin tiap menit. */
const minuteNow = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
const nowMinute = ref(minuteNow())
const nowTimer = setInterval(() => (nowMinute.value = minuteNow()), 60_000)
onBeforeUnmount(() => clearInterval(nowTimer))
const month = computed(() => monthStart(sel.value ?? today.value))
const week = computed(() => weekDates(sel.value ?? today.value))
const num = (date) => Number(date.slice(8))
const mon = (date) => BLN[Number(date.slice(5, 7)) - 1]

/**
 * Strip tanggal tampilan Hari (HP/iPad tegak): pertama dibuka hari ini di tengah (3 ke belakang, 3 ke depan).
 * Tap tanggal → strip diem; ‹ › geser 7 hari; tanggal yang dipilih di luar strip (link notif, Hari ini, dari Minggu/Bulan) → jadi tengahnya.
 */
const stripStart = ref(null)
const strip = computed(() => (stripStart.value ? stripAround(addDays(stripStart.value, 3)) : []))
const centerOn = (date) => (stripStart.value = stripAround(date)[0])
watch(sel, (date) => {
  if (date && (!stripStart.value || date < stripStart.value || date > addDays(stripStart.value, 6))) centerOn(date)
}, { immediate: true, flush: 'sync' }) // sync: strip udah bener sebelum data dimuat
const stripLabel = computed(() => (strip.value.length ? `${num(strip.value[0])} ${mon(strip.value[0])} – ${num(strip.value[6])} ${mon(strip.value[6])}` : ''))
function shiftStrip(n) {
  stripStart.value = addDays(stripStart.value, n)
  sel.value = addDays(sel.value, n)
}

const titleMain = computed(() => {
  if (!sel.value) return 'Agenda'
  if (view.value === 'month') return monthName(month.value)
  if (view.value === 'week') {
    const [ws, we] = [week.value[0], week.value[6]]
    return `${num(ws)}${mon(ws) !== mon(we) ? ` ${mon(ws)}` : ''} – ${num(we)} ${mon(we)}`
  }
  return dayTitle(sel.value)
})
const titleSub = computed(() => {
  if (!sel.value) return ''
  if (view.value === 'month') return month.value.slice(0, 4)
  if (view.value === 'week') return week.value[0] === weekStart(today.value) ? 'Minggu ini' : 'Seminggu'
  const { events, todos, bills } = store.day(sel.value)
  return `${sel.value === today.value ? 'Hari ini · ' : ''}${events.length} acara · ${todos.length} to-do${bills.length ? ` · ${bills.length} bayar rutin` : ''}`
})
const offToday = computed(() => {
  if (!sel.value) return false
  if (view.value === 'month') return month.value !== monthStart(today.value)
  if (view.value === 'week') return week.value[0] !== weekStart(today.value)
  return sel.value !== today.value
})

/** Muat rentang yang lagi keliatan — cuma kalau rentangnya berubah (atau dipaksa pas halaman dibuka lagi). */
let loadedKey = ''
async function ensure(force = false) {
  if (!sel.value) return
  const { from, to } = rangeFor(view.value, sel.value, wide.value, stripStart.value)
  const key = `${from}|${to}`
  if (!force && key === loadedKey) return
  loadedKey = key
  try {
    await store.load(view.value, sel.value, wide.value, stripStart.value)
    error.value = ''
  } catch (err) {
    loadedKey = ''
    error.value = apiErrorMessage(err)
  }
}
watch([view, sel, wide, stripStart], () => ensure())

onIonViewWillEnter(async () => {
  // Link notif: /tabs/agenda?tanggal=YYYY-MM-DD → buka tanggal itu.
  const q = route.query.tanggal
  const fromLink = typeof q === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q)
  sel.value = fromLink ? q : sel.value ?? today.value
  if (fromLink) view.value = 'day'
  await ensure(true)
  // Tanggal HP bisa beda sama server (WIB): pertama kali, ikut "hari ini" server.
  if (!fromLink && store.today && sel.value === localToday() && sel.value !== store.today) {
    sel.value = store.today
    centerOn(store.today)
  }
  openFromLink()
})
/** Link dari Beranda: ?tambah=todo (cuma iPad/PC, HP diabaikan) & ?acara=<id> (detail acara di tanggal yang lagi kebuka). Abis dipakai dibuang dari alamat. */
function openFromLink() {
  const { tambah, acara, ...rest } = route.query
  if (tambah === undefined && acara === undefined) return
  if (tambah === 'todo') {
    sel.value = today.value
    view.value = 'day'
    if (dialog.value) openForm('todo', null, null)
  }
  if (typeof acara === 'string' && /^\d+$/.test(acara) && sel.value) {
    const e = store.day(sel.value).events.find((x) => x.id === Number(acara))
    if (e) openEvent(e)
  }
  router.replace({ path: '/tabs/agenda', query: rest })
}
function onVisible() {
  if (document.visibilityState === 'visible') store.refresh()
}
document.addEventListener('visibilitychange', onVisible)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

const shiftDays = (n) => (sel.value = addDays(sel.value, n))
function shiftMonth(n) {
  const m = addMonths(month.value, n)
  sel.value = m === monthStart(today.value) ? today.value : m
}
function goDay(date) {
  sel.value = date
  view.value = 'day'
}
function backToToday() {
  sel.value = today.value
  centerOn(today.value)
}
const showError = (err) => (error.value = apiErrorMessage(err))

function openDrawer() {
  sheetKind.value = 'drawer'
  sheetOpen.value = true
}
function openEvent(e) {
  detail.value = e
  sheetKind.value = 'event'
  sheetOpen.value = true
}

function openForm(kind, item, occurrence) {
  form.value = { kind, item, date: sel.value ?? today.value, occurrence }
  formKey.value++
  sheetKind.value = 'form'
  sheetOpen.value = true
}
function add() {
  if (dialog.value) return openForm('todo', null, null)
  ionRouter.push(`/tabs/agenda/baru?tanggal=${sel.value ?? today.value}`)
}
function editTodo(row) {
  if (dialog.value) return openForm('todo', row, row.occurrence)
  sheetOpen.value = false
  ionRouter.push(`/tabs/agenda/todo/${row.id}/ubah${row.occurrence ? `?tanggal=${row.occurrence}` : ''}`)
}
function editEvent(e) {
  if (dialog.value) return openForm('event', e, e.occurrence)
  sheetOpen.value = false
  ionRouter.push(`/tabs/agenda/acara/${e.id}/ubah?tanggal=${e.occurrence}`)
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: 150px; }
.canvas { max-width: none; padding: 40px 48px 64px; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }
.h1 { margin-bottom: 16px; }
.h1-sub { display: block; font-size: .62em; letter-spacing: -0.02em; margin-top: 4px; }
.ctrls { display: flex; align-items: center; gap: 8px; }
.seg { position: relative; flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); padding: 4px; border-radius: 99px; background: var(--soft); }
.seg button { position: relative; z-index: 1; height: 38px; border: 0; border-radius: 99px; background: transparent; font: 700 13.5px var(--ion-font-family); color: var(--muted); cursor: pointer; transition: color .3s; }
.seg button.on { color: var(--text); }
.seg .ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 3); border-radius: 99px; background: var(--card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); transition: transform .45s var(--spring); }
.pillbtn { flex-shrink: 0; height: 38px; padding: 0 13px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); color: var(--text); font: 700 12.5px var(--ion-font-family);
  cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.pillbtn .n { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--ink); color: var(--on-ink); display: grid; place-items: center; font-size: 11px; }
.addbtn { display: inline-flex; align-items: center; gap: 10px; height: 46px; padding: 0 5px 0 18px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink);
  font: 700 14.5px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.addbtn:active { transform: scale(.97); }
.addbtn .ic { width: 36px; height: 36px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }

.strip-head { display: flex; align-items: center; justify-content: space-between; margin: 18px 4px 10px; }
.strip-head b { font-size: 14px; }
.arrows { display: flex; gap: 6px; }
.arrows button { width: 34px; height: 34px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.dpill { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 0 8px; border: 0; border-radius: 20px; background: var(--card); box-shadow: 0 0 0 1px var(--hair);
  color: var(--text); font-family: var(--ion-font-family); cursor: pointer; }
.dpill small { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.dpill b { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
.dpill.today b { color: var(--green); }
.dpill.on { background: var(--ink); box-shadow: none; }
.dpill.on small { color: var(--on-ink); opacity: .55; }
.dpill.on b { color: var(--lime); }
:root.theme-dark .dpill.on b { color: #141410; }
.dots { display: flex; gap: 3px; height: 5px; }
.dots i { width: 5px; height: 5px; border-radius: 9px; background: var(--green); }
.dots i.tdot { background: var(--muted); }
.dots i.bdot { background: var(--amber); }
.month-wrap { margin-top: 16px; }
.picked { margin: 22px 8px 0; font-size: 13px; font-weight: 800; }

.drawer { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 12px; padding: 12px 16px 12px 12px; border: 1.5px dashed var(--muted); border-radius: 22px;
  background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.drawer .ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; background: #FFF3B8; font-size: 20px; flex-shrink: 0; }
.drawer .grow { flex: 1; }
.drawer b { display: block; font-size: 15px; }
.drawer .grow span { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.drawer .n { min-width: 26px; height: 26px; padding: 0 8px; border-radius: 99px; background: var(--ink); color: var(--on-ink); display: grid; place-items: center; font-size: 12.5px; font-weight: 800; }

.lbl { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.lbl small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 600; }
.flat { padding: 0; }

.sh-title { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 4px; }
.sh-sub { margin: 0 0 10px; color: var(--muted); font-size: 13.5px; }

.fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5); cursor: pointer;
  transition: transform .45s var(--spring); }
.fab:active { transform: scale(.96); }
.fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) {
  .narrow { max-width: 760px; }
  .fab { bottom: 28px; right: 36px; }
}
/* PC / iPad tidur: judul kiri, kontrol kanan; Hari = kolom kiri kalender + Kapan-kapan. */
@media (min-width: 1100px) {
  .head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; }
  .h1 { margin-bottom: 0; }
  .ctrls { margin-bottom: 4px; }
  .seg { flex: none; width: 300px; }
  /* Hari & Minggu: setinggi layar, area jam scroll sendiri (jendela pendek → minimal 520px, halaman yang scroll). */
  .fill { height: 100%; display: flex; flex-direction: column; padding-bottom: 24px; }
  /* Bulan: minimal setinggi layar, tapi boleh lebih (kotak tanggal min 112px) → halaman yang scroll, jarak bawah tetep. */
  .fill.fill-grow { height: auto; min-height: 100%; }
  .daywide { display: grid; grid-template-columns: 290px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); gap: 22px; margin-top: 18px; flex: 1; min-height: 520px; }
  .aside-col { min-height: 0; overflow-y: auto; padding: 0 2px 4px; scrollbar-width: none; }
  .aside-col::-webkit-scrollbar { display: none; }
  .todo-list { padding: 4px 6px; }
  .todo-empty { padding: 14px; color: var(--muted); font-size: 13px; text-align: center; }
}
</style>
