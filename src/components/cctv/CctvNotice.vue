<template>
  <div class="shell rise cc-notice" style="--i: 2" :data-kind="kind">
    <div class="core cc-ncore">
      <span class="cc-nemoji" aria-hidden="true">
        <span v-if="busyLike" class="cc-nspin" />
        <template v-else>{{ info.emoji }}</template>
      </span>
      <div class="cc-ntext">
        <h2 class="cc-ntitle">{{ info.title }}</h2>
        <p v-if="info.sub" class="cc-nsub">{{ info.sub }}</p>
        <ol v-if="kind === 'blocked'" class="cc-nsteps">
          <li>Klik <b>ikon gembok</b> di kiri alamat situs.</li>
          <li>Pilih <b>Izin situs</b>.</li>
          <li>Izinin akses ke <b>app & layanan di device ini</b> (jaringan lokal).</li>
          <li>Balik ke sini, pencet <b>Coba lagi</b>.</li>
        </ol>
      </div>
      <button v-if="kind === 'off'" type="button" class="pill cc-nbig" data-test="start" @click="$emit('start')">
        Nyalain CCTV <span class="ic"><PhPower :size="19" weight="bold" /></span>
      </button>
      <button v-else-if="kind === 'error'" type="button" class="pill cc-nbtn" data-test="start" @click="$emit('start')">
        Coba lagi <span class="ic"><PhArrowClockwise :size="17" weight="bold" /></span>
      </button>
      <button v-else-if="kind === 'blocked' || kind === 'busy'" type="button" class="pill cc-nbtn" data-test="retry" @click="$emit('retry')">
        Coba lagi <span class="ic"><PhArrowClockwise :size="17" weight="bold" /></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhArrowClockwise, PhPower } from '@phosphor-icons/vue'

/** Kartu keadaan halaman CCTV selain "live": lagi nyambung, bukan Mac, mati, diblok Chrome, tab lain, gagal nyala. */
const props = defineProps({
  /** checking | starting | notMac | off | blocked | busy | error (idle dianggap checking). */
  kind: { type: String, required: true },
})
defineEmits(['start', 'retry'])

const TEXTS = {
  checking: { emoji: '📹', title: 'Lagi ngecek AIO CCTV…', sub: '' },
  starting: { emoji: '📹', title: 'Lagi nyalain AIO CCTV…', sub: 'Kalau Chrome nanya “Buka AIO CCTV?”, pencet Buka (centang selalu izinin biar nggak ditanya lagi).' },
  notMac: { emoji: '💻', title: 'CCTV cuma bisa dibuka dari Mac di rumah.', sub: 'Nanti bisa dari mana aja kalau udah ada mini PC.' },
  off: { emoji: '📹', title: 'CCTV lagi mati.', sub: 'Pencet tombolnya, Mac bakal nyalain AIO CCTV & kamera langsung nongol.' },
  blocked: { emoji: '🔒', title: 'Chrome belum ngizinin AIO buka CCTV.', sub: 'Cara buka izinnya:' },
  busy: { emoji: '🪟', title: 'CCTV lagi kebuka di tab lain.', sub: 'Tutup tab itu dulu, terus pencet Coba lagi.' },
  error: { emoji: '🛠️', title: 'AIO CCTV belum kepasang / nggak mau nyala.', sub: 'Cek app AIO CCTV udah kepasang di Mac ini, terus coba lagi.' },
}
const info = computed(() => TEXTS[props.kind] ?? TEXTS.checking)
const busyLike = computed(() => !TEXTS[props.kind] || props.kind === 'checking' || props.kind === 'starting')
</script>

<style scoped>
.cc-ncore { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; padding: 22px; }
.cc-nemoji { width: 56px; height: 56px; border-radius: 18px; background: #DCEBFF; display: grid; place-items: center; font-size: 28px; flex-shrink: 0; }
:root.theme-dark .cc-nemoji { background: var(--soft); }
.cc-ntext { flex: 1; min-width: 0; }
.cc-ntitle { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.2; }
.cc-nsub { margin: 6px 0 0; font-size: 13.5px; color: var(--muted); line-height: 1.45; }
.cc-nsteps { margin: 10px 0 0; padding-left: 20px; font-size: 13.5px; line-height: 1.7; color: var(--text); }
.cc-nsteps b { font-weight: 700; }
.cc-nbtn { flex-shrink: 0; }
.cc-nbig { flex-shrink: 0; height: 56px; padding-left: 24px; font-size: 16px; font-weight: 700; }
.cc-nbig .ic { width: 42px; height: 42px; }
.cc-nspin { width: 24px; height: 24px; border-radius: 99px; border: 2.5px solid var(--hair); border-top-color: var(--text); animation: cc-nturn .9s linear infinite; }
@keyframes cc-nturn { to { transform: rotate(360deg); } }
@media (min-width: 768px) {
  .cc-ncore { flex-direction: row; align-items: center; gap: 20px; padding: 26px 26px 26px 24px; }
  .cc-ntitle { font-size: 22px; }
}
</style>
