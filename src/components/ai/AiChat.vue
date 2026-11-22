<template>
  <div class="aic" data-test="chat">
    <div class="chead" :class="{ panel }">
      <button v-if="!panel" type="button" class="back" data-test="back" @click="$emit('close')"><PhCaretLeft :size="18" weight="bold" />{{ backLabel }}</button>
      <div class="ttl">
        <b>Chat AI</b>
        <span class="ctx" data-test="chip">{{ chip }}</span>
      </div>
      <span class="hacts">
        <button type="button" class="hbtn" :class="{ on: cv === 'hist' }" data-test="hist" aria-label="Riwayat obrolan" @click="toggle('hist')">🕘</button>
        <button type="button" class="hbtn" :class="{ on: cv === 'mem' }" data-test="mem" aria-label="Ingatan & pemakaian" @click="toggle('mem')">🧠</button>
      </span>
      <button v-if="panel" type="button" class="xbtn" data-test="close" aria-label="Tutup" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      <span v-else class="spacer" />
    </div>

    <div v-if="cv !== 'chat'" class="cview" data-test="cview"><p class="cvnote">Bentar lagi ya.</p></div>
    <div v-else ref="bodyEl" class="cbody" data-test="body">
      <p v-if="!conv && !failedOpen" class="sysnote" data-test="loading">Bentar ya…</p>
      <p v-else-if="!conv" class="sysnote" data-test="open-failed">Obrolannya nggak kebuka. <button type="button" class="lnk" data-test="retry-open" @click="open">Coba lagi</button></p>

      <template v-else>
        <div v-if="conv.quote" class="quote" data-test="quote">
          <div class="qh"><span class="bot">🤖</span>{{ quoteLabel }}</div>
          <div v-if="!quoteOpen" class="qp" data-test="quote-text">{{ quoteText }}</div>
          <div v-else class="qfull" data-test="quote-full">
            <div v-for="(p, i) in conv.quote.content.poin" :key="i" class="qpt"><span>{{ p.ikon }}</span><span><b class="t">{{ p.judul }}</b><span v-html="renderAiText(p.isi)" /></span></div>
          </div>
          <button type="button" data-test="quote-toggle" @click="quoteOpen = !quoteOpen">{{ quoteOpen ? 'Tutup' : 'Liat semua' }}</button>
        </div>

        <div v-if="!conv.messages.length && conv.kind !== 'eval'" class="empty" data-test="empty">
          <div class="big">🤖</div>
          <h2>Tanya soal {{ conv.context === 'badan' ? 'badan' : 'gym' }} lo</h2>
          <p>AI baca data {{ conv.context === 'badan' ? 'timbangan, target makan, sama tidur' : 'sesi gym, timbangan, target makan, sama tidur' }} lo, terus jawab pake angka lo sendiri.</p>
          <div class="sugg">
            <button v-for="q in SUGG[conv.context] ?? SUGG.gym" :key="q" type="button" data-test="sugg" @click="send(q)">{{ q }}</button>
          </div>
        </div>

        <template v-for="(m, i) in conv.messages" :key="m.id">
          <div v-if="m.role === 'user'" class="msg me" data-test="msg-me">{{ m.text }}</div>
          <template v-else>
            <div v-if="m.memory && m.memory.id != null" class="notechip" data-test="memory">📝 Gue catet: {{ m.memory.text }} <button type="button" data-test="undo" @click="ai.undoMemory(m)">Batal</button></div>
            <div class="msg ai" data-test="msg-ai" :class="{ fail: m.status === 'gagal' }">
              <span class="av">🤖</span>
              <div class="bb">
                <span v-if="m.status === 'jalan'" class="think" data-test="thinking"><i /><i /><i /><em>lagi mikir…</em></span>
                <template v-else>
                  <div v-if="m.status === 'gagal'" class="failtxt" data-test="failed">⚠️ {{ m.text }}</div>
                  <div v-else class="rich" data-test="answer" v-html="renderAiText(m.text)" />
                  <div v-if="m.tools?.length" class="tools"><span v-for="(t, k) in m.tools" :key="k" class="tool" data-test="tool">ngambil: {{ t }}</span></div>
                  <button v-if="m.status === 'gagal' && i === conv.messages.length - 1" type="button" class="resend" data-test="resend" @click="resend(i)">Kirim ulang</button>
                </template>
              </div>
            </div>
          </template>
        </template>
      </template>
    </div>

    <div v-if="cv === 'chat'" class="cinput">
      <div class="cbox">
        <textarea ref="inputEl" v-model="draft" rows="1" maxlength="2000" :placeholder="`Tanya apa aja soal ${ctxWord} lo…`" data-test="input" @keydown="onKey" />
        <button type="button" class="send" data-test="send" aria-label="Kirim" :disabled="!canSend" @click="send()"><PhArrowUp :size="20" weight="bold" /></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhArrowUp, PhCaretLeft, PhX } from '@phosphor-icons/vue'
import { PROGRAM_LABEL } from '@/lib/gym.js'
import { BLN } from '@/lib/agenda.js'
import { SUGG, chipFor, renderAiText } from '@/lib/ai.js'
import { useMedia } from '@/lib/media.js'
import { useAiStore } from '@/stores/ai.js'

/**
 * Isi chat AI (dipakai halaman HP & panel PC). Buka obrolan sendiri dari props:
 * `convId` (dari riwayat) / `sessionId` (obrolan evaluasi sesi) / cuma `context` (obrolan baru).
 * Emit `close` (tombol balik di HP, ✕ di PC).
 */
const props = defineProps({
  context: { type: String, default: 'gym' },
  sessionId: { type: Number, default: null },
  convId: { type: Number, default: null },
  /** true = tampilan panel PC (tombol ✕, tanpa tombol balik). */
  panel: { type: Boolean, default: false },
})
defineEmits(['close'])

const ai = useAiStore()
// Enter = baris baru cuma di HP (layar sempit + sentuh); iPad & laptop: Enter kirim.
const coarse = useMedia('(pointer: coarse)')
const narrow = useMedia('(max-width: 767px)')
const phone = computed(() => coarse.value && narrow.value)
const draft = ref('')
const cv = ref('chat')
const failedOpen = ref(false)
const quoteOpen = ref(false)
const bodyEl = ref(null)
const inputEl = ref(null)

const conv = computed(() => ai.current)
const busy = computed(() => {
  const last = conv.value?.messages?.[conv.value.messages.length - 1]
  return last?.role === 'assistant' && last.status === 'jalan'
})
const canSend = computed(() => !!conv.value && !busy.value && draft.value.trim().length > 0)
const chip = computed(() => chipFor(conv.value ?? { context: props.context, kind: props.sessionId != null ? 'eval' : 'chat' }))
const ctxWord = computed(() => ((conv.value?.context ?? props.context) === 'badan' ? 'badan' : 'gym'))
const backLabel = computed(() => {
  if ((conv.value?.kind ?? (props.sessionId != null ? 'eval' : 'chat')) === 'eval') return 'Ringkasan'
  return ctxWord.value === 'badan' ? 'Badan' : 'Gym'
})

const quoteLabel = computed(() => {
  const c = conv.value
  if (c?.program && c.on) return `Evaluasi AI · ${PROGRAM_LABEL[c.program] ?? c.program} ${Number(c.on.slice(8))} ${BLN[Number(c.on.slice(5, 7)) - 1]}`
  return c?.quote?.label ?? 'Evaluasi AI'
})
const quoteText = computed(() => (conv.value?.quote?.content?.poin ?? []).map((p) => p.isi.replace(/\*\*/g, '')).join(' '))

async function open() {
  failedOpen.value = false
  quoteOpen.value = false
  ai.current = null
  const res = await ai.openConv(props.convId != null ? { id: props.convId } : { context: props.context, sessionId: props.sessionId ?? undefined })
  if (!res) failedOpen.value = true
}

const toggle = (view) => (cv.value = cv.value === view ? 'chat' : view)

async function send(text) {
  const value = String(text ?? draft.value).trim()
  if (!value || !conv.value || busy.value) return
  if (text === undefined) draft.value = ''
  await ai.send(value)
}

function resend(index) {
  const msgs = conv.value?.messages ?? []
  for (let i = index - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') return send(msgs[i].text)
  }
}

function onKey(e) {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing || phone.value) return
  e.preventDefault()
  send()
}

function toBottom() {
  nextTick(() => {
    if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  })
}
watch(() => [conv.value?.messages?.length, conv.value?.messages?.[conv.value.messages.length - 1]?.status, cv.value], toBottom)

function focus() {
  inputEl.value?.focus()
}
defineExpose({ focus, open })

onMounted(open)
onBeforeUnmount(() => ai.stopWatching())
</script>

<style scoped>
.aic { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); }
.chead { padding: calc(env(safe-area-inset-top) + 8px) 14px 10px; display: flex; align-items: center; gap: 8px; box-shadow: inset 0 -1px 0 var(--hair); background: var(--app-bg); flex-shrink: 0; }
.chead.panel { padding-top: 22px; }
.back { flex-shrink: 0; display: inline-flex; align-items: center; gap: 2px; height: 44px; margin-left: -6px; padding: 0 8px 0 6px; border: 0; background: none; color: var(--muted); font: 700 14.5px var(--ion-font-family); cursor: pointer; }
.ttl { flex: 1; min-width: 0; text-align: center; }
.chead.panel .ttl { text-align: left; padding-left: 6px; }
.ttl b { display: block; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
.ctx { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 99px; background: var(--soft); font-size: 11.5px; font-weight: 800; margin-top: 3px; }
.xbtn { width: 40px; height: 40px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
.spacer { width: 0; flex-shrink: 0; }
.hacts { display: flex; gap: 6px; flex-shrink: 0; }
.hbtn { width: 40px; height: 40px; border: 0; border-radius: 99px; background: var(--soft); display: grid; place-items: center; cursor: pointer; font-size: 17px; }
.hbtn.on { background: var(--ink); color: var(--on-ink); }
.cview { flex: 1; overflow-y: auto; padding: 6px 14px 24px; }
.cvnote { margin: 10px 6px 0; font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.5; }
.cbody { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px 12px; display: flex; flex-direction: column; gap: 12px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.msg { max-width: 86%; font-size: 14.5px; font-weight: 600; line-height: 1.55; }
.msg.me { align-self: flex-end; background: var(--ink); color: var(--on-ink); padding: 10px 14px; border-radius: 20px 20px 6px 20px; white-space: pre-wrap; overflow-wrap: anywhere; }
.msg.ai { align-self: flex-start; display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 8px; max-width: 94%; }
.av { width: 30px; height: 30px; border-radius: 10px; background: var(--ink); display: grid; place-items: center; font-size: 15px; }
.bb { background: var(--card); box-shadow: 0 0 0 1px var(--hair); padding: 11px 14px; border-radius: 6px 20px 20px 20px; overflow-wrap: anywhere; }
.rich :deep(p) { margin: 0; }
.rich :deep(p + p) { margin-top: 8px; }
.rich :deep(b) { font-weight: 800; }
.rich :deep(ul) { margin: 6px 0 0; padding-left: 18px; }
.rich :deep(li + li) { margin-top: 4px; }
.failtxt { color: var(--red); font-weight: 700; }
.resend { margin-top: 8px; height: 36px; padding: 0 14px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 800 13px var(--ion-font-family); cursor: pointer; }
.tools { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tool { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 99px; background: var(--soft); color: var(--muted); font-size: 11.5px; font-weight: 700; }
.think { display: inline-flex; align-items: center; gap: 4px; margin: 0; }
.think i { width: 5px; height: 5px; border-radius: 99px; background: var(--muted); animation: dot 1.1s infinite; }
.think i:nth-child(2) { animation-delay: .15s; }
.think i:nth-child(3) { animation-delay: .3s; }
.think em { font-style: normal; margin-left: 6px; font-size: 12.5px; font-weight: 700; color: var(--muted); }
@keyframes dot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
.notechip { align-self: flex-start; margin-left: 38px; display: inline-flex; align-items: center; gap: 8px; padding: 7px 8px 7px 12px; border-radius: 14px; background: rgba(200, 240, 74, .22); font-size: 12.5px; font-weight: 700; max-width: calc(94% - 38px); }
.notechip button { border: 0; background: none; padding: 0 4px; font: 800 12px var(--ion-font-family); color: var(--muted); cursor: pointer; text-decoration: underline; }
.quote { align-self: stretch; border-radius: 22px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); padding: 12px 14px; }
.qh { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; color: var(--muted); }
.qh .bot { width: 24px; height: 24px; border-radius: 8px; background: var(--ink); display: grid; place-items: center; font-size: 12px; }
.qp { margin: 8px 0 0; font-size: 13px; font-weight: 600; line-height: 1.5; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.qfull { margin-top: 8px; display: grid; gap: 2px; font-size: 13px; font-weight: 600; line-height: 1.5; }
.qpt { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 6px; padding: 8px 0; }
.qpt + .qpt { box-shadow: inset 0 1px 0 var(--hair); }
.qpt .t { display: block; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
.qpt :deep(p) { margin: 0; }
.qpt :deep(b) { font-weight: 800; }
.quote > button { margin-top: 6px; border: 0; background: none; padding: 0; font: 800 12.5px var(--ion-font-family); color: var(--text); cursor: pointer; }
.sysnote { align-self: center; font-size: 12.5px; font-weight: 700; color: var(--muted); padding: 2px 10px; margin: 0; }
.lnk { border: 0; background: none; padding: 0; font: 800 12.5px var(--ion-font-family); color: var(--text); text-decoration: underline; cursor: pointer; }
.empty { margin: auto 0; text-align: center; padding: 10px 6px; }
.empty .big { width: 64px; height: 64px; margin: 0 auto; border-radius: 22px; background: var(--ink); display: grid; place-items: center; font-size: 32px; box-shadow: 0 0 0 6px rgba(200, 240, 74, .25); }
.empty h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin: 16px 0 4px; }
.empty p { margin: 0 auto; max-width: 300px; font-size: 13.5px; font-weight: 600; color: var(--muted); line-height: 1.5; }
.sugg { display: flex; flex-direction: column; gap: 8px; margin-top: 18px; }
.sugg button { text-align: left; min-height: 48px; padding: 10px 14px; border: 0; border-radius: 18px; background: var(--card); color: var(--text); box-shadow: 0 0 0 1px var(--hair); font: 700 14px var(--ion-font-family); cursor: pointer; line-height: 1.4; transition: transform .2s var(--spring); }
.sugg button:active { transform: scale(.98); }
.cinput { padding: 8px 12px calc(12px + env(safe-area-inset-bottom)); background: var(--app-bg); flex-shrink: 0; }
.cbox { display: flex; align-items: flex-end; gap: 8px; padding: 5px 5px 5px 16px; border-radius: 26px; background: var(--card); box-shadow: 0 0 0 1px var(--hair), var(--lift); }
.cbox textarea { flex: 1; border: 0; outline: 0; resize: none; background: transparent; color: var(--text); font: 600 16px var(--ion-font-family); padding: 10px 0; max-height: 120px; line-height: 1.4; field-sizing: content; }
.send { width: 42px; height: 42px; border: 0; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; transition: transform .2s var(--spring), opacity .2s; }
.send:disabled { opacity: .35; cursor: default; }
.send:not(:disabled):active { transform: scale(.94); }
</style>
