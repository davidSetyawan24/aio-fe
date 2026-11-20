<template>
  <div>
    <div class="p-glabel">Biodata <button type="button" class="p-edit" data-test="bio-edit" @click="$emit('edit')"><PhPencilSimple :size="14" />Ubah</button></div>
    <div class="shell"><div class="p-core">
      <CopyRow v-for="[key, label] in filled" :key="key" :label="label" :value="shown(key)" :verbatim="key === 'birthDate'" />
      <div v-if="!filled.length" class="p-empty">Belum ada biodata. Tap Ubah buat ngisi.</div>
    </div></div>
    <template v-if="bio.extra.length">
      <div class="p-glabel">Data lain</div>
      <div class="shell"><div class="p-core">
        <CopyRow v-for="(x, i) in bio.extra" :key="i" :label="x.label" :value="x.value" />
      </div></div>
    </template>
    <p v-if="filled.length" class="p-hint">Kolom yang kosong nggak ditampilin.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhPencilSimple } from '@phosphor-icons/vue'
import CopyRow from '@/components/CopyRow.vue'
import { BIO_FIELDS, birthDateLabel } from '@/lib/personal.js'

const props = defineProps({ bio: { type: Object, required: true } })
defineEmits(['edit'])
const filled = computed(() => BIO_FIELDS.filter(([key]) => props.bio.fields[key]))
/** Yang ditampilin (dan disalin): tanggal lahir '24 Juni 1995' (isi lama apa adanya), tinggi pakai 'cm'. */
function shown(key) {
  const v = String(props.bio.fields[key])
  if (key === 'birthDate') return birthDateLabel(v)
  if (key === 'height' && /^\d+$/.test(v)) return `${v} cm`
  return v
}
</script>

<style scoped>
.p-empty { padding: 18px 16px; color: var(--muted); font-size: 13.5px; font-weight: 600; }
</style>
