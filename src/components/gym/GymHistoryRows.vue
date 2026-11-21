<template>
  <div>
    <button v-for="s in sessions" :key="s.id" type="button" class="gy-hrow" data-test="hrow" @click="$emit('open', s.id)">
      <span class="gy-hdate"><small>{{ HR[weekdayOf(wibDate(s.startedAt))] }}</small><b>{{ Number(wibDate(s.startedAt).slice(8)) }}</b></span>
      <span class="grow t">
        <b>{{ PROGRAM_EMOJI[s.program] }} {{ PROGRAM_LABEL[s.program] }}<span v-if="s.prs" class="gy-chip pr">🏆 {{ s.prs }} PR</span></b>
        <small>{{ durText(minutes(s)) }} · {{ s.sets }} set · {{ volText(s.volume) }} kg</small>
      </span>
      <span class="go"><PhCaretRight :size="18" weight="bold" /></span>
    </button>
  </div>
</template>

<script setup>
import { PhCaretRight } from '@phosphor-icons/vue'
import { HR, weekdayOf } from '@/lib/agenda.js'
import { PROGRAM_EMOJI, PROGRAM_LABEL, durText, volText, wibDate } from '@/lib/gym.js'
import './gym.css'

/** Baris riwayat sesi (`Summary[]`). Tanggal = tanggal WIB jam mulai. */
defineProps({ sessions: { type: Array, required: true } })
defineEmits(['open'])

const minutes = (s) => Math.max(0, Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000))
</script>
