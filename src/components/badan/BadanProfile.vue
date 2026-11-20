<template>
  <p class="b-prof" data-test="profile">
    <span data-test="profile-text">{{ line.text }}</span>
    <template v-if="line.incomplete"> · <button type="button" class="b-proflk" data-test="profile-link" @click="go">Lengkapin di Data Pribadi ›</button></template>
  </p>
</template>

<script setup>
import { computed } from 'vue'
import { useIonRouter } from '@ionic/vue'
import { profileLine } from '@/lib/personal.js'

/** Baris kecil pudar: tinggi · umur · jenis kelamin dari Biodata. Ada yang kosong → link ke tab Biodata Data Pribadi. */
const props = defineProps({ profile: { type: Object, default: null } })
const line = computed(() => profileLine(props.profile))
const ionRouter = useIonRouter()
const go = () => ionRouter.push('/tabs/menu/data-pribadi?tab=bio')
</script>

<style scoped>
.b-prof { margin: -4px 8px 10px; font-size: 12.5px; font-weight: 600; color: var(--muted); line-height: 1.45; font-variant-numeric: tabular-nums; }
.b-proflk { border: 0; background: none; padding: 0; font: inherit; font-weight: 700; color: var(--text); cursor: pointer; }
@media (hover: hover) { .b-proflk:hover { text-decoration: underline; } }
</style>
