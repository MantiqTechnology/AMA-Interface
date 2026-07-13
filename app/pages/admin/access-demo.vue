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
    <!-- Header -->
    <div class="mb-5 d-flex flex-wrap align-center ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold text-text-primary">Access Demo</h1>
        <p class="text-text-secondary">
          Demo-only RBAC, station scope, dan tenant module entitlement. Production backend tetap
          wajib enforce.
        </p>
      </div>
    </div>

    <VAlert
      v-if="!manageDecision.allowed"
      color="warning"
      class="mb-5"
      variant="tonal"
      icon="mdi-lock-alert-outline"
    >
      {{ manageDecision.message }}
    </VAlert>

    <VRow>
      <!-- Module entitlements -->
      <VCol cols="12" lg="8">
        <VCard border>
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold py-3">
            <VIcon icon="mdi-view-grid-outline" size="18" class="text-primary" />
            <span class="text-text-primary">Module Entitlements</span>
          </VCardTitle>
          <VDivider />
          <VCardText>
            <VRow>
              <VCol
                v-for="module in store.data.value.moduleCatalog"
                :key="module.key"
                cols="12"
                md="6"
              >
                <VCard border class="h-100">
                  <VCardText>
                    <div class="d-flex align-start justify-space-between ga-3">
                      <div class="d-flex align-start ga-3 flex-grow-1" style="min-width: 0">
                        <VIcon icon="mdi-puzzle-outline" size="18" class="text-secondary mt-1" />
                        <div>
                          <div class="font-weight-bold text-text-primary">{{ module.name }}</div>
                          <div class="text-body-2 text-text-secondary">
                            {{ module.description }}
                          </div>
                        </div>
                      </div>
                      <VSwitch
                        color="secondary"
                        density="compact"
                        hide-details
                        class="mr-2 flex-shrink-0"
                        :disabled="!manageDecision.allowed || module.isMandatory"
                        :model-value="isModuleActive(module.key)"
                        @update:model-value="updateModule(module.key, $event)"
                      />
                    </div>
                    <div class="mt-3 d-flex align-center ga-2">
                      <DsStatusBadge :value="moduleStatus(module.key)" />
                      <VChip
                        v-if="module.isMandatory"
                        size="x-small"
                        variant="tonal"
                        color="secondary"
                      >
                        <VIcon icon="mdi-lock-outline" size="12" start />
                        Mandatory
                      </VChip>
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Side panels -->
      <VCol cols="12" lg="4">
        <VCard border class="mb-4">
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold py-3">
            <VIcon icon="mdi-eye-outline" size="18" class="text-primary" />
            <span class="text-text-primary">Visible Modules Now</span>
          </VCardTitle>
          <VDivider />
          <VList v-if="visibleModules().length" density="compact">
            <VListItem v-for="module in visibleModules()" :key="module.key">
              <template #prepend>
                <VIcon
                  icon="mdi-checkbox-marked-circle-outline"
                  size="18"
                  class="mr-1 text-success"
                />
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
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold py-3">
            <VIcon icon="mdi-history" size="18" class="text-primary" />
            <span class="text-text-primary">Audit Preview</span>
          </VCardTitle>
          <VDivider />
          <VList v-if="store.data.value.auditEvents.length" density="compact" lines="two">
            <VListItem v-for="event in store.data.value.auditEvents.slice(0, 6)" :key="event.id">
              <template #prepend>
                <VIcon icon="mdi-pulse" size="18" class="mr-1 text-info" />
              </template>
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
      <!-- Roles -->
      <VCol cols="12" md="6">
        <VCard border>
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold py-3">
            <VIcon icon="mdi-account-key-outline" size="18" class="text-primary" />
            <span class="text-text-primary">Roles</span>
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
                <span class="font-weight-medium text-text-primary">{{ item.name }}</span>
              </template>
              <template #[`item.scopeDefault`]="{ item }">
                <VChip size="small" variant="tonal" color="secondary">
                  {{ item.scopeDefault }}
                </VChip>
              </template>
              <template #[`item.permissions`]="{ item }">
                <span class="font-mono text-body-2">{{ permissionCount(item.id) }}</span>
              </template>
            </VDataTableServer>
          </div>
        </VCard>
      </VCol>

      <!-- Users & station scopes -->
      <VCol cols="12" md="6">
        <VCard border>
          <VCardTitle class="d-flex align-center ga-2 text-subtitle-1 font-weight-bold py-3">
            <VIcon icon="mdi-account-multiple-outline" size="18" class="text-primary" />
            <span class="text-text-primary">Users &amp; Station Scopes</span>
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
                <VChip size="small" variant="tonal" color="primary">{{ item.demoPersona }}</VChip>
              </template>
              <template #[`item.name`]="{ item }">
                <span class="font-weight-medium text-text-primary">{{ item.name }}</span>
              </template>
              <template #[`item.stationScopeIds`]="{ item }">
                <span class="font-mono text-body-2">{{ item.stationScopeIds.join(', ') }}</span>
              </template>
            </VDataTableServer>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* Uses Vuetify's --v-theme-* CSS variables throughout, so styling      */
/* adapts automatically to light/dark mode without manual overrides.    */
/* ------------------------------------------------------------------ */
.access-page {
  background: rgb(var(--v-theme-background));
}

/* ---------------------------- Header -------------------------------- */
.access-header {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.access-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  flex-shrink: 0;
}

.access-alert {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
}

/* ----------------------------- Cards ---------------------------------- */
.access-card {
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 3px rgba(var(--v-theme-on-surface), 0.06);
  transition: box-shadow 0.2s ease;
}

.access-card-title {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  min-height: 56px;
}

/* --------------------------- Module cards ------------------------------ */
.module-card {
  background: rgba(var(--v-theme-on-surface), 0.02);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--v-theme-on-surface), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.35);
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: rgb(var(--v-theme-secondary));
  background: rgba(var(--v-theme-secondary), 0.12);
  flex-shrink: 0;
  margin-top: 2px;
}

/* ------------------------------ Lists ----------------------------------- */
.access-list {
  padding: 4px 0;
}

.access-list-item {
  margin: 2px 8px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.access-list-item:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.access-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
}

/* ----------------------------- Tables ---------------------------------- */
.access-table-wrap {
  overflow-x: auto;
}

.access-table-wrap :deep(.v-data-table__tr:hover) {
  background: rgba(var(--v-theme-primary), 0.06) !important;
}

.access-table-wrap :deep(.v-data-table-header__content) {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: rgb(var(--v-theme-primary));
}
</style>
