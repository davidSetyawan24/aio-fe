<template>
  <div class="shell rise" style="--i: 6" data-test="week">
    <div class="gy-core">
      <div class="gy-week">
        <div v-for="d in week.days" :key="d.date" class="gy-wd" :class="{ today: d.date === today }">
          <span class="c" :class="{ off: !d.program }" :data-day="d.date">{{ d.program ? PROGRAM_EMOJI[d.program] : '' }}</span>{{ HR[weekdayOf(d.date)] }}
        </div>
      </div>
      <div class="gy-wsum"><span><b>{{ week.count }} sesi</b> · {{ range }}</span><span>{{ durText(week.minutes) }} total</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { HR, weekdayOf } from '@/lib/agenda.js'
import { dShort } from '@/lib/badanView.js'
import { PROGRAM_EMOJI, durText } from '@/lib/gym.js'
import './gym.css'

/** Strip Senin–Minggu (WIB): emoji latihan per hari, hari ini dilingkarin. */
const props = defineProps({
  week: { type: Object, required: true },
  today: { type: String, required: true },
})

/** "23–29 Nov" atau "30 Nov – 6 Des". */
const range = computed(() => {
  const a = props.week.days[0]?.date
  const b = props.week.days[props.week.days.length - 1]?.date
  if (!a || !b) return ''
  if (a.slice(0, 7) === b.slice(0, 7)) return `${Number(a.slice(8))}–${dShort(b)}`
  return `${dShort(a)} – ${dShort(b)}`
})
</script>
