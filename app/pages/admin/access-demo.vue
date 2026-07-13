<script setup lang="ts">
const store = useAmaDemoStore();
const { can, visibleModules } = useAuthorization();

const manageDecision = computed(() => can('platform.module.manage'));

function permissionCount(roleId: string) {
  return store.data.value.roles.find((role) => role.id === roleId)?.permissionIds.length ?? 0;
}

function updateModule(moduleKey: string, value: boolean | null) {
  if (value !== null) store.toggleModule(moduleKey, value);
}

function isModuleActive(moduleKey: string) {
  return store.data.value.tenantModules.some(
    (tenantModule) => tenantModule.moduleKey === moduleKey && tenantModule.status === 'ACTIVE'
  );
}

function moduleStatus(moduleKey: string) {
  return (
    store.data.value.tenantModules.find((tenantModule) => tenantModule.moduleKey === moduleKey)
      ?.status ?? 'DISABLED'
  );
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5">
      <h1 class="text-h4 font-weight-bold text-text-primary">Access Demo</h1>
      <p class="text-text-secondary">
        Demo-only RBAC, station scope, dan tenant module entitlement. Production backend tetap wajib
        enforce.
      </p>
    </div>

    <VAlert
      v-if="!manageDecision.allowed"
      class="mb-5"
      color="warning"
      icon="mdi-lock-alert-outline"
      variant="tonal"
    >
      {{ manageDecision.message }}
    </VAlert>

    <VRow>
      <VCol cols="12" lg="8">
        <div class="mb-3 d-flex align-center ga-2">
          <VIcon color="primary" icon="mdi-view-grid-outline" size="20" />
          <h2 class="text-subtitle-1 font-weight-bold text-text-primary">Module Entitlements</h2>
        </div>
        <VRow>
          <VCol v-for="module in store.data.value.moduleCatalog" :key="module.key" cols="12" md="6">
            <VCard border class="h-100">
              <VCardText>
                <div class="d-flex align-start justify-space-between ga-3">
                  <div class="d-flex align-start ga-3" style="min-width: 0">
                    <VIcon class="mt-1 text-secondary" icon="mdi-puzzle-outline" size="18" />
                    <div>
                      <div class="font-weight-bold text-text-primary">{{ module.name }}</div>
                      <div class="text-body-2 text-text-secondary">{{ module.description }}</div>
                    </div>
                  </div>
                  <VSwitch
                    class="flex-shrink-0"
                    color="secondary"
                    density="compact"
                    hide-details
                    :disabled="!manageDecision.allowed || module.isMandatory"
                    :model-value="isModuleActive(module.key)"
                    @update:model-value="updateModule(module.key, $event)"
                  />
                </div>
                <div class="mt-3 d-flex align-center ga-2">
                  <DsStatusBadge :value="moduleStatus(module.key)" />
                  <VChip v-if="module.isMandatory" color="secondary" size="x-small" variant="tonal">
                    <VIcon icon="mdi-lock-outline" size="12" start />
                    Mandatory
                  </VChip>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCol>

      <VCol cols="12" lg="4">
        <VCard border class="mb-4">
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
            <VIcon color="primary" icon="mdi-eye-outline" size="18" />
            Visible Modules Now
          </VCardTitle>
          <VDivider />
          <VList v-if="visibleModules().length" density="compact">
            <VListItem v-for="module in visibleModules()" :key="module.key">
              <template #prepend>
                <VIcon class="mr-1" color="success" icon="mdi-check-circle-outline" size="18" />
              </template>
              <VListItemTitle class="font-weight-medium">{{ module.name }}</VListItemTitle>
              <VListItemSubtitle>{{ module.category }}</VListItemSubtitle>
            </VListItem>
          </VList>
          <VAlert v-else class="ma-4" color="info" icon="mdi-eye-off-outline" variant="tonal">
            Tidak ada module yang terlihat untuk peran ini.
          </VAlert>
        </VCard>

        <VCard border>
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
            <VIcon color="primary" icon="mdi-history" size="18" />
            Audit Preview
          </VCardTitle>
          <VDivider />
          <VList v-if="store.data.value.auditEvents.length" density="compact" lines="two">
            <VListItem v-for="event in store.data.value.auditEvents.slice(0, 6)" :key="event.id">
              <VListItemTitle class="font-weight-medium">{{ event.action }}</VListItemTitle>
              <VListItemSubtitle>{{ event.summary }}</VListItemSubtitle>
            </VListItem>
          </VList>
          <VAlert v-else class="ma-4" color="info" icon="mdi-history" variant="tonal">
            Belum ada aktivitas audit.
          </VAlert>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-4">
      <VCol cols="12" md="6">
        <VCard border>
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
            <VIcon color="primary" icon="mdi-account-key-outline" size="18" />
            Roles
          </VCardTitle>
          <VDivider />
          <div class="overflow-x-auto">
            <VDataTableServer
              density="compact"
              hide-default-footer
              item-value="id"
              :headers="[
                { title: 'Role', key: 'name' },
                { title: 'Scope', key: 'scopeDefault' },
                { title: 'Permissions', key: 'permissions' }
              ]"
              :items="store.data.value.roles"
              :items-length="store.data.value.roles.length"
              :items-per-page="store.data.value.roles.length"
            >
              <template #[`item.name`]="{ item }">
                <span class="font-weight-medium">{{ item.name }}</span>
              </template>
              <template #[`item.scopeDefault`]="{ item }">
                <VChip color="secondary" size="small" variant="tonal">
                  {{ item.scopeDefault }}
                </VChip>
              </template>
              <template #[`item.permissions`]="{ item }">
                {{ permissionCount(item.id) }}
              </template>
            </VDataTableServer>
          </div>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard border>
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold">
            <VIcon color="primary" icon="mdi-account-multiple-outline" size="18" />
            Users &amp; Station Scopes
          </VCardTitle>
          <VDivider />
          <div class="overflow-x-auto">
            <VDataTableServer
              density="compact"
              hide-default-footer
              item-value="id"
              :headers="[
                { title: 'Persona', key: 'demoPersona' },
                { title: 'User', key: 'name' },
                { title: 'Scope', key: 'stationScopeIds' }
              ]"
              :items="store.data.value.appUsers"
              :items-length="store.data.value.appUsers.length"
              :items-per-page="store.data.value.appUsers.length"
            >
              <template #[`item.demoPersona`]="{ item }">
                <VChip color="primary" size="small" variant="tonal">
                  {{ item.demoPersona }}
                </VChip>
              </template>
              <template #[`item.name`]="{ item }">
                <span class="font-weight-medium">{{ item.name }}</span>
              </template>
              <template #[`item.stationScopeIds`]="{ item }">
                {{ item.stationScopeIds.join(', ') }}
              </template>
            </VDataTableServer>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
