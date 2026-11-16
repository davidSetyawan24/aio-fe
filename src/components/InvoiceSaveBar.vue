<template>
  <!-- Bar kaca Simpan, dipakai form Bikin/Ubah & Atur invoice. HP: ngambang di atas tab bar; PC: nempel di bawah kolom form. -->
  <div class="totbar" data-test="savebar">
    <div class="grow"><slot /></div>
    <slot name="actions" />
    <button type="button" class="pill save" data-test="save" :disabled="saving" @click="$emit('save')">
      Simpan
      <span class="ic"><span v-if="saving" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
    </button>
  </div>
</template>

<script setup>
import { PhCheck } from '@phosphor-icons/vue'

defineProps({ saving: { type: Boolean, default: false } })
defineEmits(['save'])
</script>

<style scoped>
/* <768: tab bar tetep keliatan, bar ini ngambang tepat di atasnya (tab bar ±66px + jarak 10px dari bawah). */
.totbar { position: fixed; left: 12px; right: 12px; bottom: calc(92px + env(safe-area-inset-bottom)); z-index: 25; display: flex; align-items: center; gap: 8px; padding: 7px 7px 7px 20px; border-radius: 99px; background: var(--glass); backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6); box-shadow: 0 0 0 1px var(--hair), 0 18px 40px -16px rgba(0, 0, 0, .3); }
.grow { flex: 1; min-width: 0; }
.totbar :slotted(.k) { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .14em; }
.totbar :slotted(.v) { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.totbar :slotted(.v.sm) { font-size: 14px; letter-spacing: -0.01em; }
.save { height: 46px; padding-left: 22px; flex: none; }
.save:disabled { opacity: .7; }
.spin { width: 14px; height: 14px; border-radius: 99px; border: 2px solid currentColor; border-top-color: transparent; animation: savebarspin .7s linear infinite; }
@keyframes savebarspin { to { transform: rotate(360deg); } }

/* iPad: nggak ada tab bar. */
@media (min-width: 768px) { .totbar { bottom: calc(12px + env(safe-area-inset-bottom)); } }
/* PC: ikut alur kolom form, nempel di bawah layar pas digulung (di ujung form balik ke tempatnya, nggak nutup kolom terakhir). */
@media (min-width: 1100px) { .totbar { position: sticky; left: auto; right: auto; bottom: 16px; margin-top: 22px; } }
</style>
