<template>
  <div class="b-empty-grid">
    <div>
      <div class="b-label rise">Belum ada timbangan</div>
      <div class="shell rise">
        <div class="b-core b-empty">
          <div class="em">⚖️</div>
          <h2>Belum ada timbangan</h2>
          <p>Timbang pagi-pagi, terus upload gambar hasilnya dari Zepp Life. Angkanya dibaca otomatis, lo tinggal cek.</p>
          <div class="acts">
            <button type="button" class="b-bigbtn" data-test="empty-upload" @click="$emit('upload')">Upload timbangan <span class="ic"><PhUploadSimple :size="20" weight="bold" /></span></button>
            <button type="button" class="b-ghostbtn" data-test="empty-manual" @click="$emit('manual')"><PhPencilSimple :size="18" />Isi manual</button>
          </div>
        </div>
      </div>
    </div>
    <div>
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
import { PhPencilSimple, PhUploadSimple } from '@phosphor-icons/vue'
import './badan.css'

defineEmits(['upload', 'manual'])
</script>

<style scoped>
@media (min-width: 1100px) {
  .b-empty-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 24px; align-items: start; }
  .b-empty { padding: 56px 32px 40px; }
}
</style>
