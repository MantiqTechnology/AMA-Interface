<script setup lang="ts">
import { useDisplay } from 'vuetify';
import Sidebar from '../components/layout/sidebar/Sidebar.vue';
import Topbar from '../components/layout/Topbar.vue';

const rail = useState('ama-sidebar-rail', () => false);
const { mdAndUp } = useDisplay();
const mainOffset = computed(() => (mdAndUp.value ? (rail.value ? '72px' : '272px') : '0px'));
</script>

<template>
  <Sidebar />
  <Topbar />

  <VMain
    class="min-w-0 overflow-x-hidden bg-background pt-16"
    :style="{ paddingInlineStart: mainOffset }"
  >
    <slot />
  </VMain>

  <FeatureDemoToastStack />
</template>
