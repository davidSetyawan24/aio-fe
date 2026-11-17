<template>
  <div>
    <template v-if="due.length">
      <div class="p-glabel"><span class="amb">● Perlu diurus</span><small>{{ due.length }}</small></div>
      <div class="shell"><div class="p-core" data-test="due">
        <div v-for="x in due" :key="`${x.doc.id}:${x.date.key}`" class="p-due" data-test="due-row" @click="$emit('open', x.doc.id)">
          <div class="p-av" :style="{ background: DOC_TYPES[x.doc.type].tint }">{{ DOC_TYPES[x.doc.type].emoji }}</div>
          <div class="p-grow">
            <div class="t">{{ x.title }}</div>
            <div class="s" :class="x.date.state === 'late' ? 'red' : 'amber'">{{ stateText(x.date) }} · {{ formatDate(x.date.on) }}</div>
          </div>
          <PhCaretRight :size="16" class="go" />
        </div>
      </div></div>
    </template>

    <div class="p-glabel">Dokumen <small>{{ documents.length }}</small></div>
    <div class="shell"><div class="p-core" data-test="docs">
      <div v-for="d in sorted" :key="d.id" class="p-drow" data-test="doc-row" @click="$emit('open', d.id)">
        <div class="p-av" :style="{ background: DOC_TYPES[d.type].tint }">{{ DOC_TYPES[d.type].emoji }}</div>
        <div class="p-grow">
          <b>{{ docTitle(d) }} <small v-if="docSub(d)">· {{ docSub(d) }}</small></b>
          <div class="sub">{{ displayNumber(d.values[0] ?? '') }}</div>
          <div v-if="d.dates.length">
            <span v-for="dt in d.dates" :key="dt.key" class="p-chip" :class="chipClass(dt)">{{ chipPrefix(d, dt) }}{{ stateText(dt) }}</span>
          </div>
        </div>
        <button type="button" class="p-cbtn" :class="{ ok: copiedKey === d.id }" :aria-label="`Salin ${DOC_TYPES[d.type].fields[0]}`" data-test="doc-copy"
          @click.stop="copy(d.id, DOC_TYPES[d.type].fields[0], copyValue(d.values[0] ?? ''))">
          <PhCheck v-if="copiedKey === d.id" :size="17" weight="bold" />
          <PhCopy v-else :size="17" />
        </button>
      </div>
      <div v-if="!documents.length" class="p-empty">Belum ada dokumen. Tambahin KTP, SIM, paspor, atau yang lain.</div>
    </div></div>
    <p v-if="documents.length" class="p-hint">Tap ikon salin buat nyalin nomor utamanya. Tap barisnya buat liat semua nomor & masa berlaku.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretRight, PhCheck, PhCopy } from '@phosphor-icons/vue'
import { DOC_TYPES, copyValue, displayNumber, docSub, docTitle, dueList, formatDate, sortDocs, stateText } from '@/lib/personal.js'
import { useCopy } from '@/lib/useCopy.js'

const props = defineProps({ documents: { type: Array, required: true } })
defineEmits(['open'])
const { copiedKey, copy } = useCopy()

const sorted = computed(() => sortDocs(props.documents))
const due = computed(() => dueList(props.documents))
const chipClass = (dt) => (dt.state === 'late' ? 'red' : dt.state === 'soon' ? 'amber' : 'mut')
// STNK punya dua tanggal → chip-nya dikasih awalan biar jelas yang mana.
const chipPrefix = (d, dt) => (d.type !== 'stnk' ? '' : dt.key === 'tax' ? 'Pajak · ' : 'STNK · ')
</script>

<style scoped>
.p-grow { flex: 1; min-width: 0; }
.p-due { display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; }
.p-due + .p-due { border-top: 1px solid var(--hair); }
.t { font-size: 14.5px; font-weight: 700; }
.s { font-size: 12.5px; font-weight: 600; margin-top: 2px; }
.s.amber { color: var(--p-amber); } .s.red { color: var(--red); }
.go { color: var(--muted); }
.p-drow { display: flex; align-items: center; gap: 12px; padding: 12px 10px 12px 12px; cursor: pointer; }
.p-drow + .p-drow { border-top: 1px solid var(--hair); }
.p-drow b { display: block; font-size: 15px; font-weight: 700; }
.p-drow b small { font-weight: 600; color: var(--muted); font-size: 13px; }
.sub { font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; word-break: break-all; }
.p-cbtn { flex-shrink: 0; width: 38px; height: 38px; border: 0; border-radius: 12px; background: var(--soft); display: grid; place-items: center; cursor: pointer; color: var(--text); transition: transform .2s var(--spring), background .2s; }
.p-cbtn:active { transform: scale(.92); }
.p-cbtn.ok { background: var(--lime); color: #141410; }
.p-empty { padding: 18px 16px; color: var(--muted); font-size: 13.5px; font-weight: 600; }
@media (hover: hover) { .p-due:hover, .p-drow:hover { background: var(--soft); } }
</style>
