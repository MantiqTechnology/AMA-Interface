<script setup lang="ts">
const { data: schedData } = await useAsyncData('portal-schedule', () =>
  fetchApi<any[]>('/api/hris/self-service/schedule')
);
const schedules = computed(() => schedData.value ?? []);
</script>

<template>
  <div>
    <h3 class="text-h6 font-weight-bold text-primary mb-4">Jadwal & Roster Tugas Saya</h3>

    <VCard border>
      <VList border density="comfortable" class="pa-0">
        <VListItem v-for="s in schedules" :key="s.id" class="py-3 border-b">
          <template #prepend>
            <VAvatar color="primary" variant="tonal" size="40">
              <VIcon :icon="s.flightNumber ? 'mdi-airplane' : 'mdi-clock-outline'" />
            </VAvatar>
          </template>

          <VListItemTitle class="font-weight-bold">
            {{ s.scheduleDate }} &bull; {{ s.rosterType }}
          </VListItemTitle>
          <VListItemSubtitle>
            Stasiun: {{ s.stationCode || 'HQ' }}
            <span v-if="s.shiftName">
              &bull; Shift {{ s.shiftName }} ({{ s.startTime }} - {{ s.endTime }})</span>
            <span v-if="s.flightNumber" class="text-primary font-weight-bold">
              &bull; Penerbangan {{ s.flightNumber }}</span>
          </VListItemSubtitle>

          <template #append>
            <VChip size="small" color="success" variant="flat">{{ s.status }}</VChip>
          </template>
        </VListItem>

        <VListItem v-if="!schedules.length" class="text-center py-6 text-secondary">
          Belum ada jadwal yang ditetapkan untuk Anda minggu ini.
        </VListItem>
      </VList>
    </VCard>
  </div>
</template>
