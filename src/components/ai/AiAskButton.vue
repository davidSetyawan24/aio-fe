<template>
  <button type="button" class="aiask" data-test="ask-ai" @click="$emit('ask')"><span class="e">🤖</span>Tanya AI</button>
</template>

<script setup>
/** Tombol "🤖 Tanya AI" di kanan baris atas Gym & Badan. Cuma ngabarin `ask`. */
defineEmits(['ask'])
</script>

<style scoped>
.aiask { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px 0 10px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 800 13.5px var(--ion-font-family); cursor: pointer; flex-shrink: 0; transition: transform .2s var(--spring); }
.aiask:active { transform: scale(.96); }
.aiask .e { font-size: 16px; line-height: 1; }
</style>
