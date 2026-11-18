<template>
  <div v-if="store.visible" class="upd-cap" :class="{ 'upd-solo': noSidebar }" role="status" aria-live="polite">
    <span class="upd-spark"><PhSparkle weight="fill" /></span>
    <span class="upd-txt">
      <b>Ada versi baru AIO</b>
      <small>{{ store.applying ? 'Lagi muat ulang…' : 'Biar pakai yang terbaru' }}</small>
    </span>
    <button type="button" class="upd-go" data-test="upd-go" :disabled="store.applying" @click="store.apply()">
      <span v-if="store.applying" class="upd-spin" />
      <PhArrowClockwise v-else weight="bold" />
      Muat ulang
    </button>
    <button v-if="!store.applying" type="button" class="upd-x" aria-label="Nanti aja" @click="store.dismiss()">
      <PhX weight="bold" />
    </button>
  </div>
</template>

<script setup>
import { PhArrowClockwise, PhSparkle, PhX } from '@phosphor-icons/vue'
import { useAppUpdateStore } from '@/stores/appUpdate.js'

/** `noSidebar`: halaman tanpa sidebar & selalu gelap (login/splash/offline) → kapsul terang, di iPad/PC di tengah layar penuh. */
defineProps({ noSidebar: { type: Boolean, default: false } })

const store = useAppUpdateStore()
</script>

<style scoped>
.upd-cap {
  position: fixed;
  z-index: 15;
  top: calc(env(safe-area-inset-top) + 8px);
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  border-radius: 99px;
  background: rgba(20, 20, 16, 0.92);
  color: #f3f2ee;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 18px 40px -14px rgba(0, 0, 0, 0.55);
  animation: upd-in 0.6s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes upd-in {
  from { transform: translateY(-140%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
/* Mode gelap, dan login/splash/offline yang selalu gelap: kapsul terang biar nggak nyatu sama latar. */
:root.theme-dark .upd-cap,
.upd-cap.upd-solo {
  background: rgba(242, 242, 238, 0.94);
  color: #141410;
  box-shadow: 0 18px 40px -14px rgba(0, 0, 0, 0.7);
}
.upd-spark {
  width: 30px;
  height: 30px;
  border-radius: 99px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 16px;
  background: rgba(200, 240, 74, 0.16);
  color: #c8f04a;
}
:root.theme-dark .upd-spark,
.upd-solo .upd-spark { background: #141410; }
.upd-txt { flex: 1; min-width: 0; white-space: nowrap; }
.upd-txt b, .upd-txt small { display: block; overflow: hidden; text-overflow: ellipsis; }
.upd-txt b { font-size: 13.5px; font-weight: 800; }
.upd-txt small { font-size: 11.5px; font-weight: 600; opacity: 0.6; margin-top: 1px; }
.upd-go {
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 99px;
  flex-shrink: 0;
  background: #c8f04a;
  color: #141410;
  font: 800 13px 'Plus Jakarta Sans', sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}
.upd-go:active { transform: scale(0.96); }
.upd-go:disabled { cursor: default; }
.upd-x {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 99px;
  flex-shrink: 0;
  background: transparent;
  color: inherit;
  opacity: 0.55;
  display: grid;
  place-items: center;
  font-size: 15px;
  cursor: pointer;
}
@media (hover: hover) {
  .upd-x:hover { opacity: 0.9; }
}
.upd-spin {
  width: 14px;
  height: 14px;
  border-radius: 99px;
  border: 2px solid rgba(20, 20, 16, 0.25);
  border-top-color: #141410;
  animation: upd-sp 0.7s linear infinite;
}
@keyframes upd-sp { to { transform: rotate(360deg); } }

/* iPad / PC: di tengah area konten (sebelah sidebar 260px), lebar ngikut isi. */
@media (min-width: 768px) {
  .upd-cap {
    top: calc(env(safe-area-inset-top) + 16px);
    left: calc(50% + 130px);
    right: auto;
    transform: translateX(-50%);
    animation-name: upd-in-wide;
    max-width: calc(100% - 300px);
  }
  .upd-cap.upd-solo {
    left: 50%;
    max-width: calc(100% - 40px);
  }
  @keyframes upd-in-wide {
    from { transform: translate(-50%, -140%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
}
</style>
