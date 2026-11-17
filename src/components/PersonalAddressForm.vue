<template>
  <div class="pd-form">
    <p v-if="isEdit && !original" class="pf-state" data-test="gone">Alamatnya nggak ketemu. Mungkin udah dihapus.</p>
    <form v-else novalidate :class="{ 'pf-shake': shake }" @submit.prevent="save">
      <h1 class="pf-title">{{ isEdit ? 'Ubah alamat' : 'Alamat baru' }}</h1>

      <div class="p-glabel">Nama alamat</div>
      <input v-model="form.name" class="pf-in" data-test="f-name" placeholder="mis. Rumah Bekasi" :maxlength="MAX_LABEL" autocomplete="off" aria-label="Nama alamat" @keydown.enter.prevent="focusNext" />

      <div class="p-glabel">Dipakai sebagai</div>
      <button type="button" class="pf-toggle" :class="{ on: form.ktp }" data-test="toggle-ktp" :aria-pressed="String(form.ktp)" @click="form.ktp = !form.ktp">
        <span class="pf-tick"><PhCheck v-if="form.ktp" :size="14" weight="bold" /></span>Alamat sesuai KTP
      </button>
      <button type="button" class="pf-toggle" :class="{ on: form.domicile }" data-test="toggle-dom" :aria-pressed="String(form.domicile)" @click="form.domicile = !form.domicile">
        <span class="pf-tick"><PhCheck v-if="form.domicile" :size="14" weight="bold" /></span>Alamat domisili (tempat tinggal sekarang)
      </button>

      <div class="p-glabel">Detail</div>
      <div class="pf-fld">
        <label for="pa-street">Jalan & nomor</label>
        <textarea id="pa-street" v-model="form.street" class="pf-in" data-test="f-street" placeholder="Jl. …, No. …, Blok / Tower …" :maxlength="MAX_STREET" />
      </div>
      <div class="pf-two">
        <div class="pf-fld"><label for="pa-rt">RT / RW</label><input id="pa-rt" v-model="form.rtRw" class="pf-in" data-test="f-rtRw" placeholder="003 / 007" :maxlength="MAX_VALUE" @keydown.enter.prevent="focusNext" /></div>
        <div class="pf-fld"><label for="pa-pos">Kode pos</label><input id="pa-pos" v-model="form.postalCode" class="pf-in" data-test="f-postalCode" inputmode="numeric" maxlength="5" placeholder="17411" @keydown.enter.prevent="focusNext" /></div>
      </div>
      <div v-for="[key, label] in REST" :key="key" class="pf-fld">
        <label :for="`pa-${key}`">{{ label }}</label>
        <input :id="`pa-${key}`" v-model="form[key]" class="pf-in" :data-test="`f-${key}`" :maxlength="MAX_VALUE" autocomplete="off" @keydown.enter.prevent="focusNext" />
      </div>

      <div v-if="errors.length" class="pf-err" role="alert" data-test="form-error"><p v-for="m in errors" :key="m">{{ m }}</p></div>

      <button type="submit" class="pf-save" data-test="save" :disabled="busy">
        Simpan <span><span v-if="busy" class="pf-spin" /><PhCheck v-else :size="20" weight="bold" /></span>
      </button>
      <button v-if="isEdit" type="button" class="pf-ghost" data-test="delete" :disabled="busy" @click="confirmDelete"><PhTrash :size="18" weight="bold" />Hapus alamat</button>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhCheck, PhTrash } from '@phosphor-icons/vue'
import '@/components/personal.css'
import '@/components/personalForm.css'
import { ADDRESS_FIELDS } from '@/lib/personal.js'
import { MAX_LABEL, MAX_STREET, MAX_VALUE, addressErrors, blankAddress, errorLines, focusNext } from '@/lib/personalForm.js'
import { usePersonalStore } from '@/stores/personal.js'

/** Form alamat (baru / ubah). Sukses → emit `done(pesan)`. */
const props = defineProps({ addressId: { type: [Number, String], default: null } })
const emit = defineEmits(['done'])

const store = usePersonalStore()
const busy = ref(false)
defineExpose({ busy })

const REST = ADDRESS_FIELDS.filter(([k]) => !['street', 'rtRw', 'postalCode'].includes(k))
const isEdit = props.addressId !== null && props.addressId !== ''
const original = isEdit ? store.addresses.find((a) => a.id === Number(props.addressId)) ?? null : null
const form = reactive({ ...blankAddress(), ...(original ? Object.fromEntries(Object.entries(original).filter(([k]) => k !== 'id')) : {}) })
const errors = ref([])
const shake = ref(false)

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

const body = () => ({ name: form.name.trim(), ktp: form.ktp, domicile: form.domicile, ...Object.fromEntries(ADDRESS_FIELDS.map(([k]) => [k, String(form[k]).trim()])) })

async function save() {
  if (busy.value) return
  errors.value = addressErrors(form)
  if (errors.value.length) return doShake()
  busy.value = true
  try {
    if (isEdit) await store.updateAddress(original.id, body())
    else await store.createAddress(body())
  } catch (err) {
    errors.value = errorLines(err)
    doShake()
    return
  } finally {
    busy.value = false
  }
  emit('done', 'Alamat kesimpen ✓')
}

let confirming = false
async function confirmDelete() {
  if (confirming || busy.value) return
  confirming = true
  const name = original.name
  try {
    const sheet = await actionSheetController.create({
      header: `Hapus alamat ${name}?`,
      subHeader: 'Alamatnya hilang permanen.',
      buttons: [{ text: 'Hapus', role: 'destructive', data: 'delete' }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (data !== 'delete') return
    busy.value = true
    try {
      await store.removeAddress(original.id)
    } catch (err) {
      errors.value = errorLines(err)
      return
    } finally {
      busy.value = false
    }
    emit('done', `Alamat ${name} dihapus`)
  } finally {
    confirming = false
  }
}
</script>
