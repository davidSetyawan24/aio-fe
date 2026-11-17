<template>
  <div>
    <div class="p-glabel">Alamat <small>{{ addresses.length }}</small></div>
    <div v-for="a in addresses" :key="a.id" class="shell p-acard" data-test="address">
      <div class="p-core">
        <div class="p-ahead">
          <b class="p-grow">{{ a.name }}</b>
          <span v-if="a.ktp" class="p-tag ktp">Sesuai KTP</span>
          <span v-if="a.domicile" class="p-tag dom">Domisili</span>
          <button type="button" class="p-edit" :aria-label="`Ubah ${a.name}`" data-test="address-edit" @click="$emit('edit', a.id)"><PhPencilSimple :size="16" /></button>
        </div>
        <template v-for="[key, label] in ADDRESS_FIELDS" :key="key">
          <CopyRow v-if="a[key]" :label="label" :value="a[key]" />
        </template>
        <button type="button" class="p-copyall" data-test="copy-all" @click="copy(a.id, 'Alamat lengkap', addressLine(a))">
          <PhCheck v-if="copiedKey === a.id" :size="17" weight="bold" />
          <PhCopy v-else :size="17" weight="bold" />
          {{ copiedKey === a.id ? 'Kesalin' : 'Salin semua' }}
        </button>
      </div>
    </div>
    <div v-if="!addresses.length" class="shell"><div class="p-core p-empty">Belum ada alamat. Bisa banyak, mis. sesuai KTP & domisili.</div></div>
  </div>
</template>

<script setup>
import { PhCheck, PhCopy, PhPencilSimple } from '@phosphor-icons/vue'
import CopyRow from '@/components/CopyRow.vue'
import { ADDRESS_FIELDS, addressLine } from '@/lib/personal.js'
import { useCopy } from '@/lib/useCopy.js'

defineProps({ addresses: { type: Array, required: true } })
defineEmits(['edit'])
const { copiedKey, copy } = useCopy()
</script>

<style scoped>
.p-grow { flex: 1; min-width: 0; }
.p-acard + .p-acard { margin-top: 12px; }
.p-ahead { display: flex; align-items: center; gap: 10px; padding: 14px 12px 6px 16px; }
.p-ahead b { font-size: 16px; font-weight: 800; }
.p-tag { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; font-size: 11px; font-weight: 700; background: var(--soft); color: var(--text); }
.p-tag.ktp { background: #DCEBFF; color: #1F4FA8; }
.p-tag.dom { background: #E4F7C4; color: #3D6200; }
:root.theme-dark .p-tag.ktp { background: rgba(76, 141, 246, .18); color: #8DB6FA; }
:root.theme-dark .p-tag.dom { background: rgba(200, 240, 74, .14); color: var(--lime); }
.p-copyall { margin: 6px 10px 12px; height: 44px; width: calc(100% - 20px); border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 14px var(--ion-font-family);
  display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
.p-copyall svg { color: var(--lime); }
:root.theme-dark .p-copyall svg { color: #141410; }
.p-empty { padding: 18px 16px; color: var(--muted); font-size: 13.5px; font-weight: 600; }
</style>
