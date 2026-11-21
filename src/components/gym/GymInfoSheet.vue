<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau di body ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="gy-scrim" :class="{ show: !!term }" @click="$emit('close')" />
    <div class="gy-sheet" :class="{ show: !!term, dialog: wide }" data-test="info-sheet" role="dialog" aria-modal="true" :aria-label="info[0]" :aria-hidden="String(!term)">
      <div class="gy-handle" />
      <div class="gy-ovhead">
        <div class="grow"><h2>{{ info[0] }}</h2></div>
        <button type="button" class="gy-xbtn" aria-label="Tutup" data-test="info-x" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -- teks tetap dari konstanta di file ini -->
      <p class="gy-infop" v-html="info[1]" />
      <!-- eslint-disable-next-line vue/no-v-html -- teks tetap dari konstanta di file ini -->
      <div class="gy-infon" v-html="info[2]" />
      <button type="button" class="gy-save" data-test="info-ok" @click="$emit('close')">Oke, paham <span><PhCheck :size="20" weight="bold" /></span></button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCheck, PhX } from '@phosphor-icons/vue'
import './gym.css'

/** Penjelasan istilah (volume / PR / 1RM / progressive overload). `term` null = tertutup. HP = sheet bawah, `wide` = dialog. */
const INFO = {
  volume: ['Volume', 'Total beban yang lo angkat: <b>beban × reps</b>, dijumlah semua set.', 'Contoh: 3 set 22,5 kg × 8 = 22,5 × 8 × 3 = <b>540 kg</b>. Dumbbell dihitung satu tangan aja. Volume naik dari sesi sebelumnya = latihan lo makin berat.'],
  pr: ['PR (rekor pribadi)', 'Rekor baru lo di satu gerakan. Kehitung PR kalau:', '① <b>beban terberat</b> yang pernah lo angkat (biasanya 22,5 → hari ini 25 kg), atau<br>② <b>reps terbanyak di beban yang sama</b> (biasanya 22,5 × 8 → hari ini 22,5 × 10).'],
  '1rm': ['1RM (perkiraan angkat maksimal)', 'Perkiraan beban paling berat yang bisa lo angkat <b>1 kali</b>, dihitung dari set terberat (rumus Epley: beban × (1 + reps ÷ 30)).', 'Gunanya: set beda-beda jadi bisa dibandingin. 22,5 × 10 ≈ 30 kg, 25 × 7 ≈ 31 kg → yang kedua lebih kuat walau reps-nya lebih dikit. Lo nggak perlu beneran nyoba angkat 1 kali.'],
  po: ['Progressive overload', 'Beban atau reps dinaikin <b>sedikit demi sedikit</b> dari sesi ke sesi.', 'Ini kunci otot nambah & makin kuat. Kalau garis grafik datar berminggu-minggu artinya stuck — nanti Evaluasi AI yang bantu cari kenapa & ngasih saran.'],
}

const props = defineProps({
  term: { type: String, default: null },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

// Teks terakhir dipertahanin biar nggak kosong pas animasi nutup.
const shown = ref(props.term && INFO[props.term] ? props.term : 'volume')
watch(
  () => props.term,
  (t) => t && INFO[t] && (shown.value = t),
)
const info = computed(() => INFO[shown.value])

function onKey(e) {
  if (e.key === 'Escape' && props.term) emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style>
.gy-infop { font-size: 15px; font-weight: 600; line-height: 1.55; margin: 12px 0 0; }
.gy-infon { margin-top: 12px; padding: 12px 14px; border-radius: 18px; background: var(--soft); font-size: 13px; font-weight: 600; line-height: 1.6; }
</style>
