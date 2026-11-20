<template>
  <div>
    <div class="b-label rise" style="--i: 3"><span>Makan per hari</span><button v-if="canActivity" type="button" class="b-lk" data-test="food-activity" @click="$emit('target')">Aktivitas <PhCaretRight :size="14" weight="bold" /></button></div>
    <div class="shell rise" style="--i: 3">
      <div v-if="empty" class="b-core b-mkempty" data-test="food-empty" :data-state="food.state">
        <span class="em">{{ empty.em }}</span>
        <p class="grow">{{ empty.t }}<small>{{ empty.sub }}</small></p>
        <button type="button" class="pill small" data-test="food-btn" @click="$emit(empty.act)">{{ empty.btn }}</button>
      </div>
      <div v-else class="b-core b-pad" data-test="food">
        <div class="b-eat">
          <div><div class="k">Kalori</div><div class="big" :class="{ warn: food.belowBmr }" data-test="food-kcal">±{{ fmt(food.kcal, 0) }}<small>kkal</small></div></div>
          <div><div class="k">Protein</div><div class="big" data-test="food-protein"><template v-if="food.protein == null">–</template><template v-else>±{{ fmt(food.protein, 0) }}<small>g</small></template></div></div>
        </div>
        <div v-if="food.belowBmr" class="b-warnsum" data-test="food-warn"><PhWarning :size="18" weight="bold" /><span>Target makan di bawah BMR — otot bisa ikut kebakar. Coba kecepatan Normal.</span></div>
        <div class="b-recipe" data-test="food-recipe">
          <div class="r"><span><span class="op" />BMR<small>{{ avgText }}</small></span><b>{{ fmt(food.bmr, 0) }}</b></div>
          <div class="r"><span><span class="op">×</span>{{ LEVEL_INFO[food.level] }}</span><b>{{ mult }}</b></div>
          <div class="r sum"><span><span class="op">=</span>TDEE</span><b>±{{ fmt(Math.round(food.tdee / 10) * 10, 0) }} kkal</b></div>
          <div v-if="food.adjust" class="r"><span><span class="op">{{ food.adjust < 0 ? '−' : '+' }}</span>{{ ARAH_INFO[target.arah].n }} {{ PACE_INFO[target.pace] }}</span><b>{{ food.adjust < 0 ? '−' : '+' }}{{ fmt(Math.abs(food.adjust), 0) }} kkal</b></div>
          <div v-else class="r"><span><span class="op">±</span>{{ ARAH_INFO[target.arah].n }}<small>makan pas TDEE</small></span><b>0 kkal</b></div>
        </div>
        <p v-if="food.protein != null" class="b-pnote" data-test="food-pnote">Protein <b>{{ fmt(food.proteinPerKg, 1) }} g</b> × massa tanpa lemak <b>{{ fmt(food.lean, 1) }} kg</b> · {{ avgText }}.</p>
        <p v-else class="b-pnote" data-test="food-pnote">Butuh lemak % dari timbangan.</p>
        <p v-if="food.aggressive" class="b-pnote" data-test="food-aggressive">Defisit &gt;500 kkal/hari, risiko otot lebih gede.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretRight, PhWarning } from '@phosphor-icons/vue'
import { ARAH_INFO, LEVEL_INFO, PACE_INFO, fmt } from '@/lib/badan.js'
import { avgLabel } from '@/lib/badanView.js'
import './badan.css'

const props = defineProps({
  /** `foodPlan(...)` dari store. */
  food: { type: Object, required: true },
  target: { type: Object, default: null },
  /** `summary.count` — jumlah timbangan 7 hari terakhir. */
  count: { type: Number, default: 0 },
})
defineEmits(['target', 'upload'])

const EMPTY = {
  needWeighing: { em: '⚖️', t: 'Upload timbangan dulu buat ngitung target makan.', sub: 'Butuh BMR & massa tanpa lemak dari timbangan.', act: 'upload', btn: 'Upload' },
  needTarget: { em: '🎯', t: 'Pasang target dulu (arah + aktivitas)', sub: 'Abis itu kalori & protein per hari langsung keitung.', act: 'target', btn: 'Atur target' },
  needPace: { em: '🎯', t: 'Pilih kecepatan dulu', sub: 'Buka Atur target, pilih Santai/Normal/Agresif.', act: 'target', btn: 'Atur target' },
  needActivity: { em: '🏃', t: 'Isi aktivitas dulu', sub: 'Kerja harian & gym, diisi sekali di Atur target.', act: 'target', btn: 'Atur target' },
  needBmr: { em: '⚖️', t: 'BMR belum ada di timbangan 7 hari terakhir', sub: 'Upload timbangan dari Zepp Life biar keitung.', act: 'upload', btn: 'Upload' },
}
const empty = computed(() => EMPTY[props.food.state] ?? null)
const canActivity = computed(() => !!props.target && props.food.state !== 'needWeighing')
const avgText = computed(() => avgLabel(props.count).toLowerCase())
const mult = computed(() => fmt(props.food.mult, 3).replace(/0+$/, ''))
</script>
