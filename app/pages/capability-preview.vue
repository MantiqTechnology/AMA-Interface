<script setup lang="ts">
import type {
  CapabilityPreviewItem,
  DemoCapabilityResponse
} from '#shared/contracts/demo-capabilities';

const { data, pending, error, refresh } = await useAsyncData('demo-capability-preview', () =>
  fetchApi<DemoCapabilityResponse>('/api/demo-capabilities')
);
const activeTab = ref('offline-sync');
const expanded = ref<string[]>([]);

const statusColor: Record<CapabilityPreviewItem['status'], string> = {
  PLANNED: 'info',
  ALLOWED_DRAFT: 'success',
  BLOCKED: 'error',
  QUEUED: 'warning',
  CONFLICT: 'error',
  REVIEW: 'warning'
};

const statusIcon: Record<CapabilityPreviewItem['status'], string> = {
  PLANNED: 'mdi-map-marker-path',
  ALLOWED_DRAFT: 'mdi-file-edit-outline',
  BLOCKED: 'mdi-shield-lock-outline',
  QUEUED: 'mdi-cloud-clock-outline',
  CONFLICT: 'mdi-source-branch-sync',
  REVIEW: 'mdi-clipboard-search-outline'
};

const section = computed(() => data.value?.sections.find((item) => item.id === activeTab.value));
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <VAlert
      border="start"
      class="mb-5"
      color="warning"
      icon="mdi-flask-outline"
      prominent
      title="Concept Preview — Read-only — Non-operational — Synthetic data"
      variant="tonal"
    >
      These screens communicate intended workflow boundaries. They do not submit, approve,
      synchronize, release, or certify operational records.
    </VAlert>

    <DsOperationalPageHeader
      description="A transparent view of planned resilience, safety, and security capabilities for PT AMA."
      eyebrow="Future capability"
      title="Operational Resilience & Compliance"
      :updated-at="data?.generatedAt ? new Date(data.generatedAt).toLocaleString('id-ID') : null"
    >
      <template #actions>
        <VBtn prepend-icon="mdi-refresh" :loading="pending" variant="outlined" @click="refresh">
          Refresh preview
        </VBtn>
      </template>
    </DsOperationalPageHeader>

    <VAlert v-if="error" class="mt-5" color="error" title="Preview unavailable" variant="tonal">
      {{ error.message }}
    </VAlert>
    <VSkeletonLoader v-else-if="pending" class="mt-5" type="article, list-item-three-line@3" />

    <template v-else-if="data">
      <VRow class="mt-3">
        <VCol v-for="item in data.sections" :key="item.id" cols="12" md="4">
          <VCard
            border
            class="h-100 capability-card"
            :class="{ 'capability-card--active': activeTab === item.id }"
            role="button"
            tabindex="0"
            @click="activeTab = item.id"
            @keydown.enter="activeTab = item.id"
            @keydown.space.prevent="activeTab = item.id"
          >
            <VCardText>
              <div class="mb-3 d-flex align-center justify-space-between ga-2">
                <VIcon
                  color="secondary"
                  :icon="
                    item.id === 'offline-sync'
                      ? 'mdi-cloud-sync-outline'
                      : item.id === 'sms'
                        ? 'mdi-shield-alert-outline'
                        : 'mdi-shield-account-outline'
                  "
                  size="30"
                />
                <VChip color="warning" size="x-small" variant="tonal">NOT IMPLEMENTED</VChip>
              </div>
              <div class="text-h6 font-weight-bold text-text-primary">{{ item.title }}</div>
              <div class="mt-2 text-body-2 text-text-secondary">{{ item.subtitle }}</div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <VCard v-if="section" border class="mt-4">
        <VCardTitle class="d-flex flex-wrap align-center ga-3 px-5 py-4">
          {{ section.title }}
          <VChip color="warning" size="small" variant="flat">Concept only</VChip>
        </VCardTitle>
        <VDivider />
        <VCardText class="pa-5">
          <p class="mb-5 text-body-1 text-text-secondary">{{ section.subtitle }}</p>
          <VExpansionPanels v-model="expanded" multiple variant="accordion">
            <VExpansionPanel v-for="item in section.items" :key="item.id" :value="item.id">
              <VExpansionPanelTitle>
                <div class="d-flex w-100 flex-wrap align-center ga-3 pr-3">
                  <VAvatar :color="statusColor[item.status]" size="34" variant="tonal">
                    <VIcon :icon="statusIcon[item.status]" size="19" />
                  </VAvatar>
                  <div class="min-w-0 flex-1">
                    <div class="font-weight-bold text-text-primary">{{ item.label }}</div>
                    <div class="text-caption text-text-secondary">
                      {{ item.id }} · {{ item.owner }}
                    </div>
                  </div>
                  <VChip :color="statusColor[item.status]" size="small" variant="tonal">
                    {{ item.status.replaceAll('_', ' ') }}
                  </VChip>
                </div>
              </VExpansionPanelTitle>
              <VExpansionPanelText>
                <VAlert :color="statusColor[item.status]" variant="tonal">
                  <div class="font-weight-medium">{{ item.summary }}</div>
                  <div class="mt-2 text-body-2">{{ item.detail }}</div>
                </VAlert>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </VCardText>
      </VCard>

      <VAlert class="mt-4" color="error" icon="mdi-shield-off-outline" variant="outlined">
        No operational mutation endpoint exists for these previews. This screen is not evidence of
        implementation or regulatory compliance.
      </VAlert>
    </template>
  </VContainer>
</template>

<style scoped>
.capability-card {
  cursor: pointer;
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}
.capability-card:hover,
.capability-card:focus-visible {
  border-color: rgb(var(--v-theme-secondary));
  outline: none;
  transform: translateY(-2px);
}
.capability-card--active {
  border: 2px solid rgb(var(--v-theme-secondary));
}
</style>
