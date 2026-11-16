<template>
  <div class="item" data-test="item">
    <div class="ihead">
      <span class="num">Item {{ index + 1 }}</span>
      <button v-if="removable" type="button" class="del" data-test="item-del" aria-label="Hapus item" @click="$emit('remove')"><PhTrash :size="17" /></button>
    </div>

    <div class="sugwrap">
      <input class="in" data-test="item-desc" data-nav :value="modelValue.desc" placeholder="Keterangan, misal: Cloud Development" autocomplete="off" enterkeyhint="next" @input="onDesc" @blur="open = false" @keydown.enter.prevent="$emit('enter', $event)" />
      <SuggestBox v-if="open && rows.length" test-id="item" heading="Pernah dipakai" :rows="rows" @pick="pick" />
    </div>
    <p v-if="errors.desc" class="err" :data-err="`items.${index}.desc`">{{ errors.desc }}</p>

    <textarea class="in small mt8" rows="2" data-test="item-detail" :value="modelValue.detail" placeholder="Detail kecil di bawahnya (opsional)" @input="patch({ detail: $event.target.value })" />
    <p v-if="errors.detail" class="err" :data-err="`items.${index}.detail`">{{ errors.detail }}</p>

    <div class="igrid">
      <label class="fld"><span>Jumlah</span><input class="in qty" data-test="item-qty" data-nav inputmode="numeric" :value="modelValue.qty || ''" enterkeyhint="next" @input="onQty" @keydown.enter.prevent="$emit('enter', $event)" /></label>
      <div class="fld">
        <span>Satuan</span>
        <div class="chips">
          <button v-for="u in units" :key="u" type="button" class="uchip" :class="{ on: modelValue.unit === u }" :data-unit="u" @click="patch({ unit: u })">{{ u }}</button>
        </div>
      </div>
    </div>
    <p v-if="errors.qty" class="err" :data-err="`items.${index}.qty`">{{ errors.qty }}</p>
    <p v-if="errors.unit" class="err" :data-err="`items.${index}.unit`">{{ errors.unit }}</p>

    <label class="fld"><span>Harga satuan</span><div class="money"><input class="in" data-test="item-price" data-nav inputmode="numeric" :value="formatAmount(modelValue.price)" placeholder="0" enterkeyhint="next" @input="onPrice" @keydown.enter.prevent="$emit('enter', $event)" /></div></label>
    <p v-if="errors.price" class="err" :data-err="`items.${index}.price`">{{ errors.price }}</p>

    <div class="isub"><span>Subtotal</span><b data-test="item-sub">{{ rp((modelValue.qty || 0) * (modelValue.price || 0)) }}</b></div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhTrash } from '@phosphor-icons/vue'
import SuggestBox from '@/components/SuggestBox.vue'
import { formatAmount } from '@/lib/duit.js'
import { rp } from '@/lib/invoice.js'

const UNITS = ['Paket', 'Bulan', 'Jam', 'Hari', 'Unit']
const props = defineProps({
  modelValue: { type: Object, required: true },
  index: { type: Number, required: true },
  removable: { type: Boolean, default: false },
  suggestions: { type: Array, default: () => [] },
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'remove', 'enter'])

const open = ref(false)
const patch = (changes) => emit('update:modelValue', { ...props.modelValue, ...changes })
const units = computed(() => [...new Set([...UNITS, props.modelValue.unit].filter(Boolean))])

const matches = computed(() => {
  const q = props.modelValue.desc.trim().toLowerCase()
  if (q.length < 2) return []
  return props.suggestions.filter((s) => s.desc.toLowerCase().includes(q) && s.desc.toLowerCase() !== q).slice(0, 5)
})
const rows = computed(() => matches.value.map((s) => ({ key: `${s.desc}|${s.unit}|${s.price}`, title: s.desc, sub: `${rp(s.price)} / ${s.unit}` })))

function onDesc(e) {
  open.value = true
  patch({ desc: e.target.value })
}
function pick(i) {
  const s = matches.value[i]
  open.value = false
  if (s) patch({ desc: s.desc, unit: s.unit, price: s.price })
}
function onQty(e) {
  const qty = Number(String(e.target.value).replace(/\D/g, '').slice(0, 4)) || 0
  e.target.value = qty || ''
  patch({ qty })
}
function onPrice(e) {
  const price = Number(String(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 10)) || 0
  e.target.value = formatAmount(price)
  patch({ price })
}
</script>

<style scoped>
.item { padding: 14px; }
.item + .item { box-shadow: inset 0 1px 0 var(--hair); }
.ihead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; min-height: 28px; }
.num { font-size: 12px; font-weight: 800; color: var(--muted); padding-left: 4px; }
.del { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 4px; }
.sugwrap { position: relative; }
.in { display: block; width: 100%; border: 0; outline: 0; background: var(--soft); border-radius: 16px; padding: 13px 14px; font: 600 16px var(--ion-font-family); color: var(--text); letter-spacing: -0.01em; }
.in::placeholder { color: var(--muted); font-weight: 500; opacity: .8; }
textarea.in { resize: none; line-height: 1.45; font-weight: 500; font-size: 16px; }
.in:focus { box-shadow: 0 0 0 2px var(--ink); }
.mt8 { margin-top: 8px; }
.err { color: var(--red); font-size: 12.5px; font-weight: 600; margin: 6px 6px 0; }
.igrid { display: grid; grid-template-columns: 84px 1fr; gap: 10px; }
.qty { text-align: center; }
.fld { display: block; margin-top: 12px; }
.fld > span { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin: 0 0 6px 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.uchip { height: 36px; padding: 0 14px; border-radius: 99px; border: 0; background: var(--soft); font: 700 13px var(--ion-font-family); color: var(--text); cursor: pointer; }
.uchip.on { background: var(--ink); color: var(--on-ink); }
.money { position: relative; }
.money::before { content: 'Rp'; position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--muted); font-size: 14px; pointer-events: none; }
.money .in { padding-left: 42px; font-variant-numeric: tabular-nums; font-weight: 700; }
.isub { display: flex; justify-content: space-between; margin: 12px 4px 0; font-size: 13px; color: var(--muted); font-weight: 600; }
.isub b { color: var(--text); font-variant-numeric: tabular-nums; font-weight: 800; }
@media (hover: hover) { .uchip:not(.on):hover { box-shadow: 0 0 0 1.5px var(--text); } }
</style>
