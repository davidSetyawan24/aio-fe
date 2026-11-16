<template>
  <div class="sug" role="listbox" :data-test="`sug-${testId}`">
    <div class="sh">{{ heading }}</div>
    <!-- mousedown dicegah: input nggak boleh kehilangan fokus sebelum pilihan kebaca -->
    <button v-for="(row, i) in rows" :key="row.key" type="button" role="option" :data-test="`sug-${testId}-item`" @mousedown.prevent @click="$emit('pick', i)">
      <span v-if="row.initial" class="av" :style="{ background: row.tint || '#ECEBE6' }">{{ row.initial }}</span>
      <span class="tx"><b>{{ row.title }}</b><small v-if="row.sub">{{ row.sub }}</small></span>
    </button>
  </div>
</template>

<script setup>
/** Dropdown saran (klien & item) di bawah kolom ketik. Cuma tampil; isi & kapan muncul diatur induknya. */
defineProps({
  rows: { type: Array, required: true },
  heading: { type: String, required: true },
  testId: { type: String, required: true },
})
defineEmits(['pick'])
</script>

<style scoped>
.sug { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 30; background: var(--card); border-radius: 18px; box-shadow: 0 0 0 1px var(--hair), 0 18px 40px -12px rgba(0, 0, 0, .3); padding: 6px; }
.sh { font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); padding: 6px 10px 4px; }
button { display: flex; width: 100%; text-align: left; align-items: center; gap: 10px; border: 0; background: transparent; padding: 9px 10px; border-radius: 12px; cursor: pointer; font: 700 14px var(--ion-font-family); color: var(--text); }
.tx { min-width: 0; }
.tx b { display: block; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
small { display: block; color: var(--muted); font-size: 12px; font-weight: 600; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.av { width: 34px; height: 34px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; font-size: 12px; color: #141410; flex: none; }
@media (hover: hover) { button:hover { background: var(--soft); } }
</style>
