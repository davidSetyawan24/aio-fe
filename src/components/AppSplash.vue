<template>
  <div class="splash">
    <div class="glow" aria-hidden="true" />
    <div class="center">
      <AioLogo :size="56" variant="light" class="logo" :class="{ pulse: !offline }" />
      <template v-if="offline">
        <p class="msg">Nggak bisa nyambung ke server.</p>
        <p class="sub">Cek koneksi lo, atau BE-nya lagi mati.</p>
        <button class="pill retry" :disabled="retrying" @click="retry">
          {{ retrying ? 'Nyoba lagi…' : 'Coba lagi' }}
          <span class="ic"><PhArrowClockwise :size="16" weight="bold" :class="{ spin: retrying }" /></span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PhArrowClockwise } from '@phosphor-icons/vue'
import AioLogo from './AioLogo.vue'
import { retryConnection } from '@/lib/retryConnection.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const router = useRouter()
const offline = computed(() => auth.status === 'offline')
const retrying = ref(false)

async function retry() {
  retrying.value = true
  try {
    await retryConnection(auth, router)
  } finally {
    retrying.value = false
  }
}
</script>

<style scoped>
.splash { position: fixed; inset: 0; background: #070807; color: #F3F2EE; display: grid; place-items: center; overflow: hidden; }
.glow { position: absolute; width: 90vmax; height: 90vmax; border-radius: 50%; left: 50%; top: 50%; transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(200, 240, 74, 0.16), transparent 55%); pointer-events: none; }
.center { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px; }
.pulse { animation: pulse 1.6s cubic-bezier(0.32, 0.72, 0, 1) infinite; }
@keyframes pulse { 50% { opacity: 0.55; transform: scale(0.97); } }
.msg { font-weight: 700; font-size: 18px; margin: 28px 0 4px; letter-spacing: -0.02em; }
.sub { color: rgba(243, 242, 238, 0.55); font-size: 14px; margin: 0 0 22px; }
.retry { background: #C8F04A; color: #1C2400; }
.retry .ic { background: #141410; color: #C8F04A; }
.retry:disabled { opacity: 0.7; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
