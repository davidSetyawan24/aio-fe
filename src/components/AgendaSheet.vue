<template>
  <!-- Ke body: elemen fixed di dalam ion-content nempel ke dasar konten, bukan dasar layar. -->
  <Teleport to="body">
    <div class="scrim" :class="{ show: open }" @click="$emit('close')" />
    <div class="sheet" :class="{ show: open, dialog: wide, big }" role="dialog" :aria-label="label">
      <div class="handle" />
      <slot />
    </div>
  </Teleport>
</template>

<script setup>
/** Sheet dari bawah (HP) / dialog di tengah (≥768px) buat Agenda. Isinya dari slot. */
defineProps({
  open: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  /** Form: dialog lebih lebar. */
  big: { type: Boolean, default: false },
  label: { type: String, default: '' },
})
defineEmits(['close'])
</script>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.scrim.show { opacity: 1; pointer-events: auto; }
.sheet { font-family: var(--ion-font-family); color: var(--text); position: fixed; left: 0; right: 0; bottom: 0; z-index: 41; max-width: 620px; max-height: 88vh; margin: 0 auto;
  overflow-y: auto; padding: 10px 18px calc(24px + env(safe-area-inset-bottom)); border-radius: 30px 30px 0 0; background: var(--card);
  transform: translateY(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; box-shadow: 0 -20px 50px -20px rgba(0, 0, 0, .4); }
.sheet.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.handle { width: 40px; height: 5px; margin: 0 auto 14px; border-radius: 9px; background: var(--muted); opacity: .35; }
.sheet.dialog { top: 50%; bottom: auto; left: 50%; right: auto; width: 480px; max-height: 86vh; margin: 0; padding: 24px 26px 26px; border-radius: 30px;
  box-shadow: 0 0 0 1px var(--hair), 0 40px 80px -30px rgba(0, 0, 0, .45); transform: translate(-50%, -46%) scale(.96); opacity: 0;
  transition: transform .45s var(--spring), opacity .3s var(--spring), visibility 0s .45s; }
.sheet.dialog.big { width: 560px; }
.sheet.dialog.show { transform: translate(-50%, -50%); opacity: 1; transition: transform .45s var(--spring), opacity .3s var(--spring), visibility 0s; }
.sheet.dialog .handle { display: none; }
</style>
