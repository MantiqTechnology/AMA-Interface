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
    store.data.value.tenantModules.find((tenantModule) => tenantModule.moduleKey === moduleKey)?.status ??
    'DISABLED'
  );
}
</script>

<template>
  <VContainer class="px-3 py-5 md:px-4" fluid>
    <div class="mb-5">
      <h1 class="text-3xl font-bold text-text-primary">Access Demo</h1>
      <p class="text-text-muted">
        Demo-only RBAC, station scope, dan tenant module entitlement. Production backend tetap wajib enforce.
      </p>
    </div>

    <VAlert v-if="!manageDecision.allowed" color="warning" class="mb-4" variant="tonal">
      {{ manageDecision.message }}
    </VAlert>

    <VRow>
      <VCol cols="12" lg="8">
        <VCard border>
          <VCardTitle class="text-text-primary">Module Entitlements</VCardTitle>
          <VCardText>
            <VRow>
              <VCol v-for="module in store.data.value.moduleCatalog" :key="module.key" cols="12" md="6">
                <VCard border class="h-full">
                  <VCardText>
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <div class="font-semibold text-text-primary">{{ module.name }}</div>
                        <div class="text-sm text-text-muted">{{ module.description }}</div>
                      </div>
                      <VSwitch
                        color="secondary"
                        density="compact"
                        hide-details
                        :disabled="!manageDecision.allowed || module.isMandatory"
                        :model-value="isModuleActive(module.key)"
                        @update:model-value="updateModule(module.key, $event)"
                      />
                    </div>
                    <div class="mt-3">
                      <DsStatusBadge
                        :value="moduleStatus(module.key)"
                      />
                    </div>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" lg="4">
        <VCard border class="mb-4">
          <VCardTitle class="text-text-primary">Visible Modules Now</VCardTitle>
          <VList density="compact">
            <VListItem v-for="module in visibleModules()" :key="module.key">
              <VListItemTitle>{{ module.name }}</VListItemTitle>
              <VListItemSubtitle>{{ module.category }}</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>

        <VCard border>
          <VCardTitle class="text-text-primary">Audit Preview</VCardTitle>
          <VList density="compact" lines="two">
            <VListItem v-for="event in store.data.value.auditEvents.slice(0, 6)" :key="event.id">
              <VListItemTitle>{{ event.action }}</VListItemTitle>
              <VListItemSubtitle>{{ event.summary }}</VListItemSubtitle>
            </VListItem>
          </VList>
        </VCard>
      </VCol>
    </VRow>

    <VRow class="mt-1">
      <VCol cols="12" md="6">
        <VCard border>
          <VCardTitle class="text-text-primary">Roles</VCardTitle>
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
            <template #[`item.permissions`]="{ item }">
              {{ permissionCount(item.id) }}
            </template>
          </VDataTableServer>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard border>
          <VCardTitle class="text-text-primary">Users & Station Scopes</VCardTitle>
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
            <template #[`item.stationScopeIds`]="{ item }">
              {{ item.stationScopeIds.join(', ') }}
            </template>
          </VDataTableServer>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
