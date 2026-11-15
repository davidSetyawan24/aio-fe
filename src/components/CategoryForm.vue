<template>
  <div class="category-form">
    <p v-if="isEdit && ready && !original" class="hint">Kategori nggak ketemu. Mungkin udah dihapus.</p>

    <form v-if="!isEdit || original" class="rise" :class="{ shake }" style="--i: 2" @submit.prevent="save">
      <div class="preview" data-test="preview">
        <div class="big" :style="{ background: tint }">{{ emoji }}</div>
        <div class="pv-name">{{ trimmedName || 'Nama kategori' }}</div>
      </div>

      <div class="group-label">Nama</div>
      <div class="field">
        <ion-input
          v-model="name"
          class="input"
          data-test="name"
          aria-label="Nama kategori"
          placeholder="mis. Hiburan"
          :maxlength="30"
          autocapitalize="words"
          enterkeyhint="done"
          @keydown.enter.prevent="blurName"
        />
      </div>

      <div class="group-label">Emoji</div>
      <div class="shell">
        <div class="core emojis">
          <button v-for="e in CATEGORY_EMOJIS" :key="e" type="button" class="em" :class="{ on: emoji === e }" :data-emoji="e" :aria-label="`Emoji ${e}`"
            @click="emoji = e">{{ e }}</button>
        </div>
      </div>

      <div class="group-label">Warna</div>
      <div class="shell">
        <div class="core tints">
          <button v-for="t in CATEGORY_TINTS" :key="t" type="button" class="tn" :style="{ background: t }" :data-tint="t" :aria-label="`Warna ${t}`"
            :aria-pressed="String(tint === t)" @click="tint = t">
            <PhCheck v-if="tint === t" :size="16" weight="bold" />
          </button>
        </div>
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button type="submit" class="pill save" :disabled="busy || !trimmedName">
        Simpan <span class="ic"><span v-if="busy" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
      </button>
      <button v-if="isEdit" type="button" class="pill ghost del" data-test="delete" :disabled="busy" @click="confirmDelete">
        Hapus kategori <span class="ic"><PhTrash :size="17" weight="bold" /></span>
      </button>
      <p v-if="isEdit" class="hint">Kategori yang dihapus cuma disembunyiin — catatan lama tetep nampilin namanya.</p>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { actionSheetController, IonInput } from '@ionic/vue'
import { PhCheck, PhTrash } from '@phosphor-icons/vue'
import { CATEGORY_EMOJIS, CATEGORY_TINTS } from '@/lib/categories.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useCategoriesStore } from '@/stores/categories.js'

/**
 * Isi form kategori (baru / ubah) — dipakai halaman form (HP) dan panel geser di Kategori (PC).
 * Nggak pindah halaman sendiri: sukses simpan/hapus → emit `done(pesan)`, yang make yang nutup & nampilin toast.
 */
const props = defineProps({
  /** null = kategori baru. */
  categoryId: { type: [Number, String], default: null },
  /** Dibuka dari tombol "Baru" di Catat → kategori barunya dioper balik ke sana. */
  forCatat: { type: Boolean, default: false },
})
const emit = defineEmits(['done'])

const busy = ref(false)
// Panel ngecek ini: selama lagi nyimpen / hapus, panel nggak boleh ditutup (biar hasil simpennya nyampe).
defineExpose({ busy })

const categories = useCategoriesStore()
const isEdit = computed(() => props.categoryId != null && props.categoryId !== '')
const original = computed(() => (isEdit.value ? categories.byId(props.categoryId) : null))
const ready = ref(categories.loaded)

const name = ref('')
const emoji = ref('🎬')
const tint = ref(CATEGORY_TINTS[4])
const error = ref('')
const shake = ref(false)
const trimmedName = computed(() => name.value.trim())

watch(
  original,
  (c) => {
    if (!c) return
    name.value = c.name
    emoji.value = c.emoji
    tint.value = c.tint
  },
  { immediate: true },
)

onMounted(async () => {
  if (!isEdit.value || categories.loaded) return
  try {
    await categories.load()
  } finally {
    ready.value = true
  }
})

function blurName(e) {
  e.target?.blur?.()
  document.activeElement?.blur?.()
}

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

async function save() {
  if (busy.value || !trimmedName.value) return
  const data = { name: trimmedName.value, emoji: emoji.value, tint: tint.value }
  const editing = isEdit.value
  error.value = ''
  busy.value = true
  let saved
  try {
    saved = editing ? await categories.update(original.value.id, data) : await categories.create(data, { forCatat: props.forCatat })
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    return
  } finally {
    busy.value = false
  }
  emit('done', editing ? 'Disimpen.' : `Kategori baru · ${saved.emoji} ${saved.name}`)
}

async function confirmDelete() {
  if (busy.value) return
  const label = original.value.name
  const sheet = await actionSheetController.create({
    header: `Hapus kategori ${label}?`,
    subHeader: 'Catatan lama yang pakai kategori ini tetep nampilin namanya.',
    buttons: [
      { text: 'Hapus', role: 'destructive', data: 'delete' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'delete') return
  busy.value = true
  try {
    await categories.remove(original.value.id)
  } catch (err) {
    error.value = apiErrorMessage(err)
    busy.value = false
    return
  }
  busy.value = false
  emit('done', `Kategori ${label} disembunyiin.`)
}
</script>

<style scoped>
.preview { display: grid; place-items: center; margin: 4px 0 2px; }
.big { width: 96px; height: 96px; border-radius: 30px; display: grid; place-items: center; font-size: 46px; box-shadow: var(--lift); transition: background-color .4s var(--spring); }
.pv-name { margin-top: 12px; min-height: 26px; font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.field { display: flex; align-items: center; height: 58px; padding: 0 16px; border-radius: 18px; background: var(--soft); }
.input { flex: 1; min-width: 0; min-height: 0; --background: transparent; --color: var(--text); --placeholder-color: var(--muted); --placeholder-opacity: 1;
  --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; --highlight-height: 0; font: 600 16px var(--ion-font-family); }
.emojis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; padding: 12px; }
.em { aspect-ratio: 1; border: 0; border-radius: 14px; background: transparent; font-size: 22px; cursor: pointer; transition: transform .3s var(--spring); }
.em:active { transform: scale(.9); }
.em.on { background: var(--soft); box-shadow: inset 0 0 0 2px var(--ink); }
.tints { display: flex; flex-wrap: wrap; gap: 10px; padding: 14px; }
.tn { width: 40px; height: 40px; border-radius: 99px; border: 0; display: grid; place-items: center; color: #141410; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .06); }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 6px 0; line-height: 1.45; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 12px 6px 0; }
.save, .del { width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save { margin-top: 18px; }
.del { margin-top: 12px; }
.save .ic, .del .ic { width: 42px; height: 42px; }
.del .ic { background: rgba(240, 83, 61, .14); color: var(--red); }
.save:disabled, .del:disabled { opacity: .45; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>
