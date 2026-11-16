<template>
  <div class="sheet" :class="{ 's-lunas': m.stamp }" data-test="sheet">
    <div class="s-pad">
      <header class="s-hd">
        <div class="s-brand">
          <div class="s-mark">{{ m.lh.initial }}<i /></div>
          <div>
            <div class="s-nm">{{ m.lh.name }}</div>
            <div class="s-ct">{{ [m.lh.phone, m.lh.email].filter(Boolean).join(' · ') }}</div>
          </div>
        </div>
        <div class="s-doc">
          <div class="s-ttl">Invoice<i /></div>
          <div class="s-no">{{ m.number }}</div>
        </div>
      </header>

      <section class="s-top2">
        <div>
          <div class="s-lbl">Kepada</div>
          <div class="s-who"><template v-if="m.client.name">{{ m.client.name }}</template><span v-else class="s-ph">Nama klien</span></div>
          <div v-if="m.client.attn" class="s-up">U.p. {{ m.client.attn }}</div>
          <div class="s-addr">
            <template v-if="m.client.addressLines.length"><template v-for="(line, i) in m.client.addressLines" :key="i"><br v-if="i" />{{ line }}</template></template>
            <span v-else class="s-ph">Alamat klien</span>
            <template v-if="m.client.email"><br />{{ m.client.email }}</template>
          </div>
          <div class="s-meta">
            <div><span class="s-lbl">Tanggal</span><b>{{ m.issued }}</b></div>
            <div><span class="s-lbl">Jatuh tempo</span><b>{{ m.due }}</b></div>
          </div>
        </div>
        <div class="s-sum">
          <div>
            <div class="s-lbl">Total tagihan</div>
            <div class="s-amt">{{ m.total }}</div>
          </div>
          <div class="s-due"><span>{{ m.chip.label }}</span><span class="s-chip">{{ m.chip.text }}</span></div>
        </div>
      </section>

      <div v-if="m.subject" class="s-perihal"><span class="s-lbl">Perihal</span><b>{{ m.subject }}</b></div>
      <div v-else style="height: 26px" />
      <div class="s-intro">{{ m.opening }}</div>

      <table class="s-tbl">
        <thead>
          <tr><th>#</th><th>Keterangan</th><th>Jumlah</th><th class="s-r">Harga satuan</th><th class="s-r">Subtotal</th></tr>
        </thead>
        <tbody>
          <template v-if="m.rows.length">
            <tr v-for="r in m.rows" :key="r.no">
              <td class="s-n">{{ r.no }}</td>
              <td class="s-it"><template v-if="r.desc">{{ r.desc }}</template><span v-else class="s-ph">Keterangan</span><small v-if="r.detail">{{ r.detail }}</small></td>
              <td class="s-q">{{ r.qty }}</td>
              <td class="s-r s-p">{{ r.price }}</td>
              <td class="s-r s-s">{{ r.subtotal }}</td>
            </tr>
          </template>
          <tr v-else><td /><td class="s-it"><span class="s-ph">Belum ada item</span></td><td /><td /><td /></tr>
        </tbody>
      </table>

      <div class="s-tot">
        <div class="s-terbilang">{{ m.terbilang }}</div>
        <div class="s-box">
          <div v-for="e in m.extras" :key="e.label" class="s-row"><span>{{ e.label }}</span><b>{{ e.value }}</b></div>
          <div class="s-grand"><span>Total</span><b>{{ m.total }}</b></div>
        </div>
      </div>

      <section class="s-bottom">
        <div class="s-bank">
          <div class="s-lbl">Pembayaran ditransfer ke</div>
          <div class="s-kv"><span>Bank</span><b>{{ m.lh.bank }}</b><span>No. rekening</span><b>{{ m.lh.accountNo }}</b><span>Atas nama</span><b>{{ m.lh.accountName }}</b></div>
        </div>
        <div class="s-sign">
          <div v-if="m.stamp" class="s-stamp"><b>LUNAS</b><span>{{ m.stamp }}</span></div>
          Hormat saya,
          <div class="s-ttd"><img v-if="m.lh.signature" :src="m.lh.signature" alt="Tanda tangan" /></div>
          <div class="s-line">{{ m.lh.name }}</div>
        </div>
      </section>

      <section v-if="m.notes.length" class="s-notes">
        <div class="s-lbl">Catatan</div>
        <ol><li v-for="(n, i) in m.notes" :key="i">{{ n }}</li></ol>
      </section>
    </div>
    <footer class="s-ft"><span>{{ m.closing }}</span><span><b>{{ m.number }}</b> · Hal 1/1</span></footer>
    <div class="s-strip" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { sheetModel } from '@/lib/invoice.js'

/** Kertas invoice 794px (A4) — isinya SEMUA dari sheetModel (sama dengan PDF). Kertas selalu putih, nggak ikut mode gelap. */
const props = defineProps({ invoice: { type: Object, required: true } })
const m = computed(() => sheetModel(props.invoice))
</script>

<style scoped>
.sheet { width: 794px; min-height: 1123px; background: #fff; color: #23231F; display: flex; flex-direction: column; position: relative; font-family: 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.01em; text-align: left; }
.s-pad { flex: 1; padding: 56px 60px 24px; }
.s-hd { display: flex; justify-content: space-between; align-items: flex-start; }
.s-brand { display: flex; gap: 14px; align-items: center; }
.s-mark { width: 46px; height: 46px; border-radius: 13px; background: #141410; color: #F3F2EE; display: flex; align-items: baseline; justify-content: center; padding-top: 9px; font-weight: 800; font-size: 22px; letter-spacing: -0.065em; line-height: 1; flex: none; font-family: 'Plus Jakarta Sans', sans-serif; }
.s-mark i { width: 5px; height: 5px; border-radius: 9px; background: #C8F04A; margin-left: 2px; }
.s-nm { font-weight: 800; font-size: 17px; letter-spacing: -0.03em; color: #141410; }
.s-ct { font-size: 11px; color: #8A8A82; margin-top: 3px; font-weight: 500; }
.s-doc { text-align: right; }
.s-ttl { font-size: 40px; font-weight: 800; letter-spacing: -0.05em; line-height: .9; color: #141410; display: inline-flex; align-items: baseline; }
.s-ttl i { width: 9px; height: 9px; border-radius: 9px; background: #C8F04A; margin-left: 3px; }
.s-no { font-size: 11.5px; font-weight: 700; color: #8A8A82; margin-top: 9px; letter-spacing: .02em; }
.s-top2 { display: grid; grid-template-columns: 1fr 268px; gap: 28px; margin-top: 34px; }
.s-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #8A8A82; }
.s-who { font-size: 15px; font-weight: 800; color: #141410; margin-top: 8px; letter-spacing: -0.02em; }
.s-up { font-size: 11.5px; font-weight: 600; margin-top: 4px; }
.s-addr { font-size: 11px; line-height: 1.6; color: #8A8A82; margin-top: 6px; }
.s-meta { display: flex; gap: 26px; margin-top: 14px; }
.s-meta b { display: block; font-size: 11.5px; color: #141410; margin-top: 4px; font-weight: 700; }
.s-sum { border-radius: 18px; background: #C8F04A; color: #141410; padding: 20px 22px; display: flex; flex-direction: column; justify-content: space-between; }
.s-sum .s-lbl { color: rgba(28, 36, 0, .6); }
.s-amt { font-size: 27px; font-weight: 800; letter-spacing: -0.04em; margin-top: 8px; font-variant-numeric: tabular-nums; }
.s-due { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; font-size: 11px; color: rgba(28, 36, 0, .6); font-weight: 600; }
.s-chip { display: inline-flex; padding: 5px 10px; border-radius: 99px; background: #141410; color: #C8F04A; font-size: 11px; font-weight: 800; }
.s-lunas .s-chip { background: #2BA864; color: #fff; }
.s-perihal { margin-top: 26px; display: flex; gap: 10px; align-items: baseline; font-size: 12px; }
.s-perihal b { color: #141410; font-weight: 700; }
.s-intro { font-size: 11px; color: #8A8A82; margin-top: 4px; }
.s-tbl { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
.s-tbl th { text-align: left; font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #8A8A82; padding: 0 0 10px; border-bottom: 1.5px solid #141410; }
.s-tbl td { padding: 9px 0; border-bottom: 1px solid #E6E5DF; vertical-align: top; font-variant-numeric: tabular-nums; }
.s-tbl .s-r { text-align: right; }
.s-n { width: 28px; color: #8A8A82; font-weight: 600; }
.s-q { width: 78px; white-space: nowrap; } .s-p { width: 108px; } .s-s { width: 112px; font-weight: 700; color: #141410; }
.s-it { font-weight: 700; color: #141410; padding-right: 18px; }
.s-it small { display: block; font-weight: 500; color: #8A8A82; font-size: 10px; line-height: 1.5; margin-top: 3px; white-space: pre-line; }
.s-tot { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; margin-top: 10px; }
.s-terbilang { max-width: 300px; font-size: 10.5px; line-height: 1.5; color: #8A8A82; font-style: italic; padding-bottom: 4px; }
.s-box { width: 300px; flex: none; }
.s-row { display: flex; justify-content: space-between; font-size: 11.5px; padding: 3px 0; font-variant-numeric: tabular-nums; }
.s-row span { color: #8A8A82; font-weight: 600; } .s-row b { color: #141410; font-weight: 700; }
.s-grand { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; padding-top: 10px; border-top: 1.5px solid #141410; }
.s-grand span { font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #141410; }
.s-grand b { font-size: 22px; font-weight: 800; letter-spacing: -0.04em; color: #141410; font-variant-numeric: tabular-nums; }
.s-bottom { display: grid; grid-template-columns: 1fr 210px; gap: 36px; margin-top: 22px; align-items: end; }
.s-bank { border-radius: 16px; background: #F3F2EE; padding: 16px 18px; position: relative; overflow: hidden; }
.s-bank::before { content: ''; position: absolute; left: 0; top: 16px; bottom: 16px; width: 3px; border-radius: 0 3px 3px 0; background: #C8F04A; }
.s-bank .s-lbl { margin-bottom: 10px; }
.s-kv { display: grid; grid-template-columns: 92px 1fr; row-gap: 5px; font-size: 11.5px; }
.s-kv span { color: #8A8A82; font-weight: 500; } .s-kv b { color: #141410; font-weight: 700; }
.s-sign { position: relative; text-align: center; font-size: 11.5px; }
.s-ttd { height: 52px; margin-top: 2px; display: flex; align-items: center; justify-content: center; }
.s-ttd img { max-height: 52px; max-width: 100%; object-fit: contain; }
.s-line { border-top: 1px solid #141410; margin-top: 4px; padding-top: 7px; font-weight: 800; color: #141410; }
.s-stamp { position: absolute; right: 150px; top: -14px; transform: rotate(-9deg); border: 3px solid #2BA864; color: #2BA864; border-radius: 14px; padding: 8px 18px 7px; text-align: center; background: rgba(255, 255, 255, .75); z-index: 3; }
.s-stamp b { display: block; font-size: 30px; font-weight: 800; letter-spacing: .14em; line-height: 1; }
.s-stamp span { font-size: 10px; font-weight: 700; letter-spacing: .08em; white-space: nowrap; }
.s-notes { margin-top: 18px; }
.s-notes ol { margin: 6px 0 0; padding-left: 16px; font-size: 10.5px; line-height: 1.6; color: #5E5D57; }
.s-notes li { padding-left: 4px; }
.s-ft { display: flex; justify-content: space-between; align-items: center; padding: 0 60px 22px; font-size: 10px; color: #8A8A82; font-weight: 600; }
.s-ft b { color: #141410; font-weight: 700; }
.s-strip { height: 8px; background: #141410; position: relative; }
.s-strip::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 34%; background: #C8F04A; }
.s-ph { color: #C4C3BC; font-style: italic; font-weight: 500; }
</style>
