<template>
  <div>
    <p v-if="!report && failed" class="gy-fail" data-test="failed">{{ failed }} <button type="button" @click="load">Coba lagi</button></p>
    <p v-else-if="!report" class="gy-wait" data-test="wait">Bentar ya…</p>
    <template v-else>
      <GymSessionEdit v-if="editing" ref="edit" :key="id" :report="report" @saved="$emit('stop-edit')" />
      <template v-else>
        <GymReport mode="detail" :report="report" />
        <div class="gy-btn2">
          <button type="button" class="gy-ghost" data-test="edit" :disabled="deleting" @click="$emit('edit')"><PhPencilSimple :size="17" weight="bold" />Ubah</button>
          <button type="button" class="gy-ghost red" data-test="delete" :disabled="deleting" @click="askDelete"><PhTrash :size="17" weight="bold" />Hapus sesi</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import GymReport from '@/components/gym/GymReport.vue'
import GymSessionEdit from '@/components/gym/GymSessionEdit.vue'
import { sessionName } from '@/lib/gymReport.js'
import { showToast } from '@/lib/personalForm.js'
import { useGymStore } from '@/stores/gym.js'

/**
 * Detail sesi selesai + form ubah + hapus (dipakai halaman HP & panel PC).
 * Emit: `edit` (mau ubah), `stop-edit` (ubah selesai / dibatalin), `deleted` (sesi kehapus).
 */
const props = defineProps({
  id: { type: Number, required: true },
  editing: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'stop-edit', 'deleted'])
const store = useGymStore()
const failed = ref('')
const deleting = ref(false)
const edit = ref(null)
const report = computed(() => store.reports[props.id] ?? null)
defineExpose({ busy: computed(() => deleting.value || !!edit.value?.busy) })

async function load() {
  failed.value = ''
  try {
    await store.report(props.id, { force: true })
  } catch (e) {
    failed.value = e?.message || 'Nggak bisa muat sesinya.'
  }
}
// Simpenan (mis. baru Selesai) langsung ditampilin, server tetep dicek di belakang.
watch(() => props.id, load, { immediate: true })

let asking = false
async function askDelete() {
  if (asking || deleting.value || !report.value) return
  asking = true
  try {
    const r = report.value
    const sheet = await actionSheetController.create({
      header: `Hapus sesi ${sessionName(r.session.program, r.session.startedAt)}?`,
      subHeader: `${r.summary.sets} set ilang dari riwayat & grafik. PR dihitung ulang.`,
      buttons: [{ text: 'Hapus sesi', role: 'destructive', data: 'delete' }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (data !== 'delete') return
    deleting.value = true
    try {
      await store.deleteSession(props.id)
    } catch (e) {
      showToast(e?.message || 'Sesinya belum kehapus. Coba lagi.')
      return
    }
    showToast('Sesi dihapus')
    emit('deleted')
  } finally {
    asking = false
    deleting.value = false
  }
}
</script>
