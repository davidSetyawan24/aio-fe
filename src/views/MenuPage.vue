<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page">
        <PageHeader eyebrow="Semua menu">Semua modul.<br /><span>Satu tempat.</span></PageHeader>

        <label class="search rise" style="--i: 2">
          <PhMagnifyingGlass :size="19" />
          <input v-model="query" type="search" placeholder="Cari modul…" aria-label="Cari modul" autocomplete="off" />
        </label>

        <section v-for="(group, gi) in groups" :key="group.key" class="group rise" :style="{ '--i': gi + 3 }">
          <h2 class="cat">{{ group.label }}</h2>
          <div class="grid">
            <button v-for="m in group.modules" :key="m.key" class="tile tap" @click="open(m)">
              <span class="ic" :style="{ background: m.tint }">{{ m.emoji }}</span>
              <span class="name">{{ m.label }}</span>
              <span v-if="m.status === 'soon'" class="soon">Segera</span>
            </button>
          </div>
        </section>

        <p v-if="!groups.length" class="empty">Nggak ada modul "{{ query.trim() }}".</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import { groupByCategory, modulePath, searchModules } from '@/modules/registry.js'

const ionRouter = useIonRouter()
const query = ref('')
const groups = computed(() => groupByCategory(searchModules(query.value)))
const open = (m) => ionRouter.push(modulePath(m))
</script>

<style scoped>
.search { display: flex; align-items: center; gap: 12px; height: 54px; padding: 0 18px; border-radius: 99px; background: var(--card);
  box-shadow: 0 0 0 1px var(--hair), var(--lift); color: var(--muted); margin-bottom: 8px; }
.search:focus-within { box-shadow: 0 0 0 2px var(--ink), var(--lift); color: var(--text); }
.search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: 500 16px var(--ion-font-family); }
.search input::placeholder { color: var(--muted); }
.search input::-webkit-search-cancel-button { display: none; }
.cat { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin: 26px 4px 12px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
@media (min-width: 600px) { .grid { grid-template-columns: repeat(4, 1fr); gap: 14px; } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(6, 1fr); } }
.tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px 8px 14px; border: 0; border-radius: 24px;
  background: var(--card); box-shadow: 0 0 0 1px var(--hair), var(--lift); color: var(--text); font-family: var(--ion-font-family); cursor: pointer; }
.ic { width: 58px; height: 58px; border-radius: 19px; display: grid; place-items: center; font-size: 28px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6); }
.name { font-weight: 700; font-size: 13.5px; letter-spacing: -0.01em; }
.soon { position: absolute; top: 8px; right: 8px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; padding: 3px 7px; border-radius: 99px;
  background: var(--soft); color: var(--muted); }
.empty { text-align: center; color: var(--muted); margin-top: 40px; }
</style>
