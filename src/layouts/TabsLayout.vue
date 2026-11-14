<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button v-for="item in tabs" :key="item.path" :tab="item.path" :href="item.path">
          <span class="tb"><component :is="item.icon" :size="22" :weight="isActive(item.path) ? 'fill' : 'light'" /></span>
          {{ item.label }}
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup>
import { IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { tabItems } from '@/modules/registry.js'

const tabs = tabItems()
const route = useRoute()
// Halaman modul (/tabs/menu/tagihan) tetep nyalain tab "Semua menu".
const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)
</script>
