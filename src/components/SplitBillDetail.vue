<template>
  <div v-if="bill" class="detail">
    <span class="eyebrow"><span class="dot" />{{ longDay(bill.spentOn) }}</span>
    <div class="big-q">{{ bill.emoji }} {{ bill.place }} <span>· {{ bill.people.length }} orang</span></div>

    <div class="shell rise" style="--i: 1">
      <div class="hero">
        <div class="k">{{ bill.outstanding ? 'Belum balik ke lo' : 'Semua udah bayar' }}</div>
        <div class="v" data-test="owed">{{ bill.outstanding ? rp(bill.outstanding) : 'Lunas 🎉' }}</div>
        <div class="facts">
          <span class="fact">total struk <b>{{ rp(bill.total) }}</b></span>
          <span class="fact">bagian lo <b>{{ rp(myShare?.total ?? 0) }}</b></span>
          <span v-if="bill.discount" class="fact">hemat diskon <b>{{ rp(bill.discount) }}</b></span>
        </div>
      </div>
    </div>

    <div class="cards" :class="{ grid: wide }">
      <div v-for="(row, i) in rows" :key="row.person.id" class="shell rise" :style="{ '--i': 2 + Math.min(i, 5) }">
        <div class="core card" :class="{ lunas: row.person.paid && !row.person.me }" data-test="person" :data-person="row.person.id">
          <div class="top">
            <span class="pa lg" :class="{ me: row.person.me }" :style="row.person.me ? null : { background: tintOf(i) }">{{ initial(row.person.name) }}</span>
            <div class="nm">
              {{ row.person.name }}
              <small>{{ row.person.me ? 'lo yang bayar ke kasir' : row.person.paid ? 'udah bayar ✓' : 'belum bayar' }}</small>
            </div>
            <div class="tot" data-test="total">{{ rp(row.share.total) }}</div>
          </div>
          <div class="lines">
            <div v-for="l in row.share.items" :key="l.itemId" class="ln" data-test="line"><span>{{ itemLabel(l) }}</span><b>{{ rp(l.amount) }}</b></div>
            <template v-if="row.charges.length || row.share.rounding">
              <hr />
              <div v-for="c in row.charges" :key="c.key" class="ln" :class="{ disc: c.key === 'discount' }" data-test="charge"><span>{{ c.emoji }} {{ c.label }}</span><b>{{ money(c.amount) }}</b></div>
              <div v-if="row.share.rounding" class="ln" data-test="rounding"><span>Pembulatan</span><b>{{ money(row.share.rounding) }}</b></div>
            </template>
            <hr />
            <div class="ln sum"><span>Total</span><b>{{ rp(row.share.total) }}</b></div>
          </div>
          <div v-if="!row.person.me" class="acts">
            <button class="act wa" data-test="wa" @click="tagih(row.person)"><PhWhatsappLogo :size="18" weight="fill" />Tagih via WA</button>
            <button class="act paid" :class="{ yes: row.person.paid }" data-test="paid" :disabled="busy === row.person.id" @click="togglePaid(row.person)">
              <PhCheck v-if="row.person.paid" :size="16" weight="bold" />{{ row.person.paid ? 'Udah bayar' : 'Tandain lunas' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <button class="pill ghost wide-btn" data-test="image" @click="saveImage">Simpan jadi gambar <span class="ic"><PhDownloadSimple :size="17" weight="bold" /></span></button>
    <p class="hint">{{ touch ? 'Gambarnya kebuka di menu Bagikan: "Simpan Gambar" ke galeri, atau langsung kirim ke grup.' : 'Gambarnya langsung ke-download (PNG).' }}</p>
    <div class="row2">
      <button class="pill ghost wide-btn" data-test="edit" @click="emit('edit')">Ubah <span class="ic"><PhPencilSimple :size="17" weight="bold" /></span></button>
      <button class="pill ghost wide-btn del" data-test="delete" :disabled="busy === 'delete'" @click="confirmDelete">Hapus <span class="ic"><PhTrash :size="17" weight="bold" /></span></button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { actionSheetController, toastController } from '@ionic/vue'
import { PhCheck, PhDownloadSimple, PhPencilSimple, PhTrash, PhWhatsappLogo } from '@phosphor-icons/vue'
import { shareBillImage } from '@/lib/billImage.js'
import { longDay } from '@/lib/duit.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { chargeRows, initial, itemLabel, money, tintOf, waText } from '@/lib/splitBill.js'
import { rp } from '@/lib/wallet.js'
import { useSplitBillsStore } from '@/stores/splitBills.js'

const props = defineProps({
  billId: { type: [Number, String], required: true },
  /** Layar lebar: kartu orang jadi grid. */
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'deleted'])

const store = useSplitBillsStore()
const bill = computed(() => store.byId(props.billId))
const busy = ref(null)
const error = ref('')
/** HP/iPad (layar sentuh) → menu Bagikan; Mac → langsung download. */
const touch = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches)


const rows = computed(() =>
  (bill.value?.people ?? []).map((person) => {
    const share = bill.value.shares.find((s) => s.personId === person.id)
    return { person, share, charges: chargeRows(bill.value, share) }
  }),
)
const myShare = computed(() => rows.value.find((r) => r.person.me)?.share)

const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

async function togglePaid(person) {
  if (busy.value) return
  busy.value = person.id
  error.value = ''
  try {
    await store.setPaid(bill.value.id, person.id, !person.paid)
    showToast(person.paid ? `${person.name} balik ke belum bayar` : `${person.name} lunas ✓`)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busy.value = null
  }
}

function tagih(person) {
  // Tanpa nomor: WhatsApp kebuka dengan teks udah keisi, orangnya dipilih sendiri di WhatsApp.
  // Langsung ke api.whatsapp.com — redirect dari wa.me ngerusak emoji (👋 jadi �).
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText(bill.value, person.id))}`, '_blank')
}

async function saveImage() {
  if (busy.value) return
  busy.value = 'image'
  error.value = ''
  try {
    const how = await shareBillImage(bill.value)
    if (how === 'downloaded') showToast('Gambarnya kedownload 📸')
  } catch {
    error.value = 'Gambarnya gagal dibikin, coba lagi ya.'
  } finally {
    busy.value = null
  }
}

async function confirmDelete() {
  if (busy.value) return
  const sheet = await actionSheetController.create({
    header: 'Hapus split bill ini?',
    subHeader: 'Nggak bisa dibalikin.',
    buttons: [
      { text: 'Hapus', role: 'destructive', data: 'delete' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'delete' || busy.value) return
  busy.value = 'delete'
  error.value = ''
  try {
    await store.remove(bill.value.id)
    showToast('Split bill dihapus.')
    emit('deleted')
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busy.value = null
  }
}
</script>

<style scoped>
.big-q { font-size: 26px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.15; margin: 12px 4px 14px; }
.big-q span { color: var(--muted); font-weight: 600; }
.hero { position: relative; overflow: hidden; padding: 20px 20px 18px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.hero > * { position: relative; }
.k { font-size: 12.5px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.v { font-size: 40px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.fact { padding: 5px 10px; border-radius: 99px; background: rgba(243, 242, 238, .08); font-size: 11.5px; font-weight: 600; color: rgba(243, 242, 238, .7); font-variant-numeric: tabular-nums; }
.fact b { color: #F3F2EE; }

.cards { display: grid; gap: 12px; margin-top: 12px; }
.cards.grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.card { padding: 16px; transition: opacity .3s var(--spring); }
.top { display: flex; align-items: center; gap: 12px; }
.pa { display: inline-grid; place-items: center; font-weight: 800; color: #141410; flex-shrink: 0; }
.pa.lg { width: 44px; height: 44px; font-size: 16px; border-radius: 15px; }
.pa.me { background: #141410; color: var(--lime); }
:root.theme-dark .pa.me { background: #F2F2EE; color: #141410; }
.nm { font-weight: 700; font-size: 16px; min-width: 0; }
.nm small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.tot { margin-left: auto; text-align: right; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.lines { margin-top: 12px; padding: 10px 12px; border-radius: 16px; background: var(--soft); font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.ln { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; }
.ln b { color: var(--text); font-weight: 600; white-space: nowrap; }
.ln.disc b { color: var(--green); }
.ln.sum span { color: var(--text); font-weight: 700; }
.ln.sum b { font-weight: 800; }
.lines hr { border: 0; border-top: 1.5px dashed rgba(20, 20, 15, .14); margin: 7px 0; }
:root.theme-dark .lines hr { border-top-color: var(--hair); }
.acts { display: flex; gap: 8px; margin-top: 12px; }
.act { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 44px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text);
  font: 700 13.5px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.act:active { transform: scale(.97); }
.act.wa { background: #25D366; color: #06371B; }
.act.paid { background: var(--ink); color: var(--on-ink); }
.act.paid.yes { background: rgba(43, 168, 100, .12); color: var(--green); }
.act:disabled { opacity: .5; }
.card.lunas .top, .card.lunas .lines { opacity: .62; }
.card.lunas .tot { text-decoration: line-through; text-decoration-thickness: 2px; }

.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 14px 6px 0; }
.wide-btn { width: 100%; justify-content: space-between; height: 54px; padding: 8px 8px 8px 22px; font-size: 15px; margin-top: 12px; }
.wide-btn .ic { width: 38px; height: 38px; background: var(--card); color: var(--text); }
.wide-btn.del .ic { background: rgba(240, 83, 61, .14); color: var(--red); }
.row2 { display: flex; gap: 10px; }
.hint { color: var(--muted); font-size: 12.5px; margin: 8px 8px 0; line-height: 1.45; }
</style>
