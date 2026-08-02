<script setup lang="ts">
const selectedDate = ref(new Date().toISOString().slice(0, 10));

const { data: rosterData, refresh } = await useAsyncData(
  'flight-roster',
  () =>
    fetchApi<any[]>('/api/hris/schedules/flight-roster', {
      params: { date: selectedDate.value }
    }),
  { watch: [selectedDate] }
);

const roster = computed(() => rosterData.value ?? []);

const headers = [
  { title: 'No. Penerbangan', key: 'flightNumber' },
  { title: 'Rute', key: 'route' },
  { title: 'Pesawat', key: 'registrationNumber' },
  { title: 'Pilot in Command (PIC)', key: 'pic' },
  { title: 'Co-Pilot (FO)', key: 'copilot' }
];
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Roster Penerbangan Crew</h1>
        <p class="text-subtitle-1 text-secondary">
          Pemetaan crew pilot yang bertugas pada setiap penerbangan
        </p>
      </div>
      <VBtn prepend-icon="mdi-arrow-left" variant="outlined" to="/hris/schedules">Kembali</VBtn>
    </div>

    <VCard border class="pa-4 mb-4">
      <VRow>
        <VCol cols="12" sm="4">
          <VTextField
            v-model="selectedDate"
            label="Tanggal Penerbangan"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
            @change="refresh()"
          />
        </VCol>
      </VRow>
    </VCard>

    <VCard border>
      <VDataTable :headers="headers" :items="roster">
        <template #item.flightNumber="{ item }">
          <span class="font-mono font-weight-bold text-primary">
            <VIcon icon="mdi-airplane" size="16" class="mr-1" />{{ item.flightNumber }}
          </span>
        </template>
        <template #item.route="{ item }">
          <span class="font-weight-bold">{{ item.originCode }} &rarr; {{ item.destCode }}</span>
        </template>
        <template #item.registrationNumber="{ item }">
          <VChip size="small" variant="outlined">{{ item.registrationNumber || '-' }}</VChip>
        </template>
        <template #item.pic="{ item }">
          <div v-if="item.picName" class="font-weight-bold">
            {{ item.picName }} <span class="text-caption text-secondary">({{ item.picCode }})</span>
          </div>
          <VChip v-else size="small" color="error" variant="tonal">Belum Ditugaskan</VChip>
        </template>
        <template #item.copilot="{ item }">
          <div v-if="item.copilotName" class="font-weight-bold">
            {{ item.copilotName }}
            <span class="text-caption text-secondary">({{ item.copilotCode }})</span>
          </div>
          <span v-else class="text-secondary">—</span>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
