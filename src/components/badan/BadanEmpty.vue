<template>
  <div class="b-empty-grid">
    <div>
      <div class="b-label rise">Mulai</div>
      <div class="shell rise">
        <div class="b-core b-empty">
          <div class="em">⚖️</div>
          <h2>Belum ada timbangan</h2>
          <p>Timbang pagi-pagi, terus upload gambar hasilnya dari Zepp Life. Angkanya dibaca otomatis, lo tinggal cek.</p>
          <div class="acts">
            <button type="button" class="b-bigbtn" data-test="empty-upload" @click="$emit('upload')">Upload timbangan <span class="ic"><PhUploadSimple :size="20" weight="bold" /></span></button>
            <button type="button" class="b-ghostbtn" data-test="empty-manual" @click="$emit('manual')"><PhPencilSimple :size="18" />Isi manual</button>
            <button type="button" class="b-ghostbtn" data-test="empty-sleep" @click="$emit('sleep')"><PhMoon :size="18" />Upload tidur</button>
          </div>
        </div>
      </div>
    </div>
    <div>
      <template v-if="sleep">
        <BadanFood v-if="target" :food="food" :target="target" :count="0" @upload="$emit('upload')" @target="(f) => $emit('target', f)" />
        <BadanSleepCard :sleep="sleep" :summary="sleepSum" :today="today" :i="1" @open="(id) => $emit('openSleep', id)" />
      </template>
      <div class="b-label rise" style="--i: 1">Cara dapetin gambarnya</div>
      <div class="shell rise" style="--i: 1">
        <div class="b-core">
          <ol class="b-steps">
            <li><span>Naik timbangan, tunggu sampe angkanya <b>berhenti kedip</b>.</span></li>
            <li><span>Buka <b>Zepp Life</b> → hasil timbang hari ini → <b>Bagikan</b> → simpen gambar.</span></li>
            <li><span>Balik ke sini, tap <b>Upload timbangan</b>, pilih gambarnya.</span></li>
          </ol>
        </div>
      </div>
      <p class="b-fhint">Gambarnya nggak disimpen, cuma angkanya.</p>
    </div>
  </div>
</template>

<script setup>
import { PhMoon, PhPencilSimple, PhUploadSimple } from '@phosphor-icons/vue'
import BadanFood from './BadanFood.vue'
import BadanSleepCard from './BadanSleepCard.vue'
import './badan.css'

/** Belum ada timbangan. Udah ada tidur → kolom kanan nampilin Makan (nunggu timbangan, kalau target ada) + Tidur terakhir biar tidurnya tetep bisa dibuka. */
defineProps({
  food: { type: Object, default: null },
  target: { type: Object, default: null },
  /** Tidur terakhir (`store.lastSleep`) atau null. */
  sleep: { type: Object, default: null },
  sleepSum: { type: Object, default: null },
  today: { type: String, required: true },
})
defineEmits(['upload', 'manual', 'sleep', 'target', 'openSleep'])
</script>

<style scoped>
@media (min-width: 1100px) {
  .b-empty-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 24px; align-items: start; }
  .b-empty { padding: 56px 32px 40px; }
}
</style>
