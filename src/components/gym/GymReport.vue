<template>
  <div>
    <!-- Ringkasan abis Selesai -->
    <template v-if="mode === 'summary'">
      <div class="shell rise" style="margin-top: 6px">
        <div class="gy-hero" data-test="hero">
          <div class="ttl">{{ PROGRAM_LABEL[session.program] }} beres {{ PROGRAM_EMOJI[session.program] }}</div>
          <div class="sub">{{ dateLine }}</div>
          <div class="gy-hstats">
            <div><div class="k">Durasi</div><div class="v" data-test="stat-dur"><template v-if="sum.durationMin >= 60"><b>{{ Math.floor(sum.durationMin / 60) }}</b><small> j </small></template><b>{{ sum.durationMin % 60 }}</b><small> m</small></div></div>
            <div>
              <div class="k">Volume <button type="button" class="gy-info" aria-label="Apa itu volume?" data-test="info-volume" @click="term = 'volume'">?</button></div>
              <div class="v" data-test="stat-vol">{{ volText(sum.volume) }}<small>kg</small></div>
              <span v-if="chip" class="d" :class="{ n: chip.tone !== 'up' }" data-test="vol-chip">{{ chip.text }}</span>
            </div>
            <div><div class="k">Set</div><div class="v" data-test="stat-sets">{{ sum.sets }}</div></div>
            <div><div class="k">PR baru <button type="button" class="gy-info" aria-label="Apa itu PR?" data-test="info-pr" @click="term = 'pr'">?</button></div><div class="v" data-test="stat-prs">{{ sum.prs }}<small>🏆</small></div></div>
          </div>
        </div>
      </div>
      <div class="gy-sumgrid">
        <section v-if="prRows.length">
          <div class="gy-label rise" style="--i: 2"><span>PR baru 🏆</span><button type="button" class="gy-info" aria-label="Apa itu PR?" data-test="info-pr" @click="term = 'pr'">?</button></div>
          <div class="shell rise" style="--i: 2">
            <div class="gy-core">
              <div v-for="x in prRows" :key="x.exerciseId" class="gy-prrow" data-test="pr-row">
                <span class="em">🏆</span>
                <span class="grow"><b>{{ x.name }}</b><small>{{ prText(x.pr) }}</small></span>
                <span class="v">{{ setText(x.pr.set) }}</span>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div class="gy-label rise" style="--i: 3"><span>Per gerakan</span><small>set terberat vs sesi lalu</small></div>
          <div class="shell rise" style="--i: 3">
            <div class="gy-core">
              <div v-for="x in report.exercises" :key="x.exerciseId" class="gy-cmprow" data-test="cmp-row">
                <div><b>{{ x.name }}</b><small>{{ x.sets.length }} set · {{ x.sets.map((s) => setText([s.weight, s.reps])).join(', ') }}</small></div>
                <div class="r">
                  <div class="v">{{ setText(x.best) }}</div>
                  <span v-if="x.cmp === 'new'" class="arw eq new">baru</span>
                  <template v-else>
                    <span class="arw" :class="ARROW[x.cmp][0]">{{ ARROW[x.cmp][1] }}</span>
                    <small v-if="x.prevBest">vs {{ setText(x.prevBest) }}</small>
                  </template>
                </div>
              </div>
              <div v-for="x in report.skipped" :key="`s${x.exerciseId}`" class="gy-cmprow skip" data-test="cmp-row">
                <div><b>{{ x.name }}</b><small>dilewatin</small></div>
                <div class="r"><span class="arw eq">–</span></div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div class="gy-label rise" style="--i: 4"><span>Evaluasi</span></div>
          <AiEvalBox :session-id="session.id" :program="session.program" mode="summary" @talk="$emit('talk')" />
        </section>
      </div>
    </template>

    <!-- Detail sesi (riwayat) -->
    <template v-else>
      <div class="shell" style="margin-top: 6px">
        <div class="gy-core gy-dstats" data-test="dstats">
          <div><div class="k">Durasi</div><div class="v" data-test="stat-dur">{{ durText(sum.durationMin) }}</div></div>
          <div>
            <div class="k">Volume <button type="button" class="gy-info" aria-label="Apa itu volume?" data-test="info-volume" @click="term = 'volume'">?</button></div>
            <div class="v" data-test="stat-vol">{{ volText(sum.volume) }}<small>kg</small></div>
            <span v-if="sum.volumeDeltaPct != null" class="gy-chip" :class="sum.volumeDeltaPct > 0 ? 'green' : sum.volumeDeltaPct < 0 ? 'amber' : 'mut'" style="margin-top: 4px" data-test="vol-chip">{{ sum.volumeDeltaPct > 0 ? '+' : '' }}{{ sum.volumeDeltaPct }}%</span>
          </div>
          <div><div class="k">Set</div><div class="v" data-test="stat-sets">{{ sum.sets }}</div></div>
        </div>
      </div>
      <div class="shell" style="margin-top: 12px">
        <div class="gy-core">
          <div v-for="x in report.exercises" :key="x.exerciseId" class="gy-dex" data-test="dex">
            <div class="t">
              <span class="grow">{{ x.name }}<span v-if="!session.planned.includes(x.exerciseId)" class="gy-tagx">tambahan</span></span>
              <span v-if="x.pr" class="gy-chip pr" data-test="pr-chip">🏆 PR</span>
            </div>
            <div class="gy-dsets">
              <div v-for="(s, j) in x.sets" :key="s.id" class="gy-dset" data-test="dset"><span class="n">{{ j + 1 }}</span><span>{{ kgText(s.weight) }} kg × {{ s.reps }}</span><span class="vol">{{ volText(s.weight * s.reps) }} kg</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="gy-label"><span>Evaluasi AI</span><small>ikut kesimpen</small></div>
      <AiEvalBox :session-id="session.id" :program="session.program" mode="detail" @talk="$emit('talk')" />
    </template>

    <GymInfoSheet :term="term" :wide="wide" @close="term = null" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AiEvalBox from '@/components/ai/AiEvalBox.vue'
import GymInfoSheet from '@/components/gym/GymInfoSheet.vue'
import { PROGRAM_EMOJI, PROGRAM_LABEL, durText, kgText, setText, volText } from '@/lib/gym.js'
import { prText, sessionDateLine, volChip } from '@/lib/gymReport.js'
import { useMedia } from '@/lib/media.js'
import './gym.css'
import './gymReport.css'

/** Isi ringkasan (`summary`, abis Selesai) atau detail (`detail`, riwayat) dari satu `Report`. */
const props = defineProps({
  report: { type: Object, required: true },
  mode: { type: String, default: 'summary' },
})
// Pindah ke chat evaluasi diurus yang makai komponen ini.
defineEmits(['talk'])

const ARROW = { up: ['up', '↑'], same: ['eq', '='], down: ['dn', '↓'] }
const term = ref(null)
const wide = useMedia('(min-width: 768px)')

const session = computed(() => props.report.session)
const sum = computed(() => props.report.summary)
const dateLine = computed(() => sessionDateLine(session.value.startedAt, session.value.endedAt))
const chip = computed(() => volChip(sum.value.volumeDeltaPct, sum.value.volumeVs))
const prRows = computed(() => props.report.exercises.filter((x) => x.pr))
</script>
