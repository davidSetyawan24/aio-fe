<template>
  <span class="aio-logo" :class="variant" :style="{ '--s': size + 'px' }">
    <span class="word">aio</span><span class="dot" />
  </span>
</template>
<script setup>
defineProps({ size: { type: Number, default: 40 }, variant: { type: String, default: 'dark' } })
</script>
<style scoped>
.aio-logo { display: inline-flex; align-items: baseline; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800;
  font-size: var(--s); letter-spacing: -0.065em; line-height: 1; }
.word { color: var(--logo-fg); }
.dot { width: calc(var(--s) * .2); height: calc(var(--s) * .2); border-radius: 99px; background: var(--logo-dot); margin-left: calc(var(--s) * .06); }
.dark { --logo-fg: var(--text); --logo-dot: var(--lime); }
.light { --logo-fg: #F3F2EE; --logo-dot: var(--lime); }
.ink { --logo-fg: #141410; --logo-dot: #fff; }
</style>
