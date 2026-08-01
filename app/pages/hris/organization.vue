<script setup lang="ts">
const { data: treeData, refresh } = await useAsyncData('org-tree-hierarchical', () =>
  fetchApi<any[]>('/api/hris/organization/tree')
);

const searchQuery = ref('');
const openedPanels = ref<string[]>([]);

const rawTree = computed(() => treeData.value ?? []);

function collectAllIds(nodes: any[]): string[] {
  let ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children && node.children.length) {
      ids = ids.concat(collectAllIds(node.children));
    }
  }
  return ids;
}

function expandAll() {
  openedPanels.value = collectAllIds(rawTree.value);
}

function collapseAll() {
  openedPanels.value = [];
}

// Automatically expand top-level nodes on load
watch(
  rawTree,
  (val) => {
    if (val && val.length) {
      openedPanels.value = val.map((n: any) => n.id);
    }
  },
  { immediate: true }
);

function matchesSearch(node: any, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const nameMatch =
    node.departmentName?.toLowerCase().includes(q) ||
    node.departmentCode?.toLowerCase().includes(q);
  const headMatch = node.headName?.toLowerCase().includes(q);

  const empMatch = node.employees?.some(
    (e: any) =>
      e.fullName?.toLowerCase().includes(q) ||
      e.positionTitle?.toLowerCase().includes(q) ||
      e.employeeCode?.toLowerCase().includes(q)
  );

  const childMatch = node.children?.some((c: any) => matchesSearch(c, query));

  return nameMatch || headMatch || empMatch || childMatch;
}

const filteredTree = computed(() => {
  if (!searchQuery.value.trim()) return rawTree.value;
  return rawTree.value.filter((node: any) => matchesSearch(node, searchQuery.value));
});

function getLevelColor(level: string) {
  switch (level?.toUpperCase()) {
    case 'DIRECTORATE':
      return 'primary';
    case 'DIVISION':
      return 'info';
    case 'DEPARTMENT':
      return 'success';
    default:
      return 'secondary';
  }
}

function getRankBadgeColor(title: string) {
  const t = title.toUpperCase();
  if (t.includes('CHIEF') || t.includes('DIRECTOR') || t.includes('HEAD')) return 'error';
  if (t.includes('MANAGER') || t.includes('SUPERINTENDENT')) return 'warning';
  if (t.includes('CAPTAIN') || t.includes('LEAD') || t.includes('SENIOR')) return 'primary';
  if (t.includes('FIRST OFFICER')) return 'info';
  return 'secondary';
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Struktur Organisasi & Hirarki Jabatan</h1>
        <p class="text-subtitle-1 text-secondary">
          Struktur hirarki direktorat, divisi, dan posisi jabatan karyawan per departemen PT. AMA
        </p>
      </div>

      <div class="d-flex ga-2 flex-wrap">
        <VBtn
          prepend-icon="mdi-unfold-more-horizontal"
          variant="outlined"
          color="primary"
          @click="expandAll()"
        >
          Buka Semua Dropdown
        </VBtn>
        <VBtn
          prepend-icon="mdi-unfold-less-horizontal"
          variant="outlined"
          color="secondary"
          @click="collapseAll()"
        >
          Tutup Semua
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="text" @click="refresh()">Refresh</VBtn>
      </div>
    </div>

    <!-- Search Bar Filter -->
    <VCard border class="pa-4 mb-6">
      <VTextField
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        placeholder="Cari departemen, nama pejabat, jabatan (Chief, Manager, Captain...)..."
        variant="outlined"
        density="compact"
        hide-details
        clearable
      />
    </VCard>

    <!-- Main Collapsible Dropdown Tree -->
    <div v-if="filteredTree.length">
      <VExpansionPanels v-model="openedPanels" multiple class="org-tree-panels">
        <VExpansionPanel
          v-for="dept in filteredTree"
          :key="dept.id"
          :value="dept.id"
          border
          class="mb-3 rounded-lg overflow-hidden elevation-1"
        >
          <!-- Root Level 1 Title -->
          <VExpansionPanelTitle class="py-3 bg-surface border-b">
            <div class="d-flex align-center justify-space-between w-100 pr-4 flex-wrap ga-2">
              <div class="d-flex align-center ga-3">
                <VChip
                  size="small"
                  :color="getLevelColor(dept.departmentLevel)"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ dept.departmentLevel }}
                </VChip>
                <div>
                  <span class="text-h6 font-weight-bold text-primary">{{
                    dept.departmentName
                  }}</span>
                  <span class="text-caption text-secondary font-mono ml-2">({{ dept.departmentCode }})</span>
                </div>
              </div>

              <div class="d-flex align-center ga-3">
                <div
                  v-if="dept.headName"
                  class="d-flex align-center ga-2 text-subtitle-2 bg-primary-lighten-5 px-3 py-1 rounded-pill border"
                >
                  <VIcon icon="mdi-account-star" color="primary" size="18" />
                  <span class="font-weight-bold text-primary">{{ dept.headName }}</span>
                  <span class="text-caption text-secondary">({{ dept.headPosition }})</span>
                </div>
                <VChip size="small" color="primary" variant="tonal">
                  {{ dept.employeeCount }} Karyawan
                </VChip>
              </div>
            </div>
          </VExpansionPanelTitle>

          <!-- Root Level Content (Position Hierarchy + Children) -->
          <VExpansionPanelText class="pa-4 bg-grey-lighten-5">
            <!-- Section A: Position Hierarchy Breakdown within this department -->
            <div v-if="dept.positionHierarchy?.length" class="mb-6">
              <div
                class="text-subtitle-2 font-weight-bold text-primary mb-3 d-flex align-center ga-2"
              >
                <VIcon icon="mdi-sitemap-outline" color="primary" size="20" />
                <span>Hirarki Posisi & Jabatan Staff ({{ dept.departmentName }})</span>
              </div>

              <div class="d-flex flex-column ga-3">
                <div
                  v-for="group in dept.positionHierarchy"
                  :key="group.positionTitle"
                  class="pa-3 border rounded bg-white"
                >
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center ga-2">
                      <VChip
                        size="x-small"
                        :color="getRankBadgeColor(group.positionTitle)"
                        variant="flat"
                        class="font-weight-bold"
                      >
                        {{ group.positionTitle }}
                      </VChip>
                      <span class="text-caption text-secondary font-weight-medium">({{ group.count }} orang)</span>
                    </div>
                  </div>

                  <!-- Members Grid -->
                  <div class="d-flex flex-wrap ga-2 pt-1">
                    <VCard
                      v-for="emp in group.members"
                      :key="emp.id"
                      border
                      flat
                      class="pa-2 d-flex align-center justify-space-between ga-3 bg-surface"
                      style="min-width: 280px; flex: 1 1 280px"
                    >
                      <div class="d-flex align-center ga-2">
                        <VAvatar color="primary" size="32" class="text-caption font-weight-bold">
                          {{ emp.fullName.charAt(0) }}
                        </VAvatar>
                        <div>
                          <div class="font-weight-bold text-body-2 text-high-emphasis">
                            {{ emp.fullName }}
                          </div>
                          <div class="text-caption text-secondary font-mono">
                            {{ emp.employeeCode }}
                          </div>
                        </div>
                      </div>

                      <VBtn
                        size="x-small"
                        variant="tonal"
                        color="primary"
                        icon="mdi-eye"
                        :to="`/hris/employees/${emp.id}`"
                        title="Lihat Detail Profil Karyawan"
                      />
                    </VCard>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section B: Nested Sub-Departments / Units (Level 2 & 3) -->
            <div v-if="dept.children?.length">
              <div
                class="text-subtitle-2 font-weight-bold text-secondary mb-3 d-flex align-center ga-2"
              >
                <VIcon icon="mdi-folder-network-outline" size="20" />
                <span>Sub-Departemen & Unit Kerja Bawahan</span>
              </div>

              <VExpansionPanels v-model="openedPanels" multiple class="child-panels">
                <VExpansionPanel
                  v-for="child in dept.children"
                  :key="child.id"
                  :value="child.id"
                  border
                  class="mb-2 rounded bg-white"
                >
                  <VExpansionPanelTitle class="py-2">
                    <div class="d-flex align-center justify-space-between w-100 pr-4">
                      <div class="d-flex align-center ga-2">
                        <VChip
                          size="x-small"
                          :color="getLevelColor(child.departmentLevel)"
                          variant="outlined"
                        >
                          {{ child.departmentLevel }}
                        </VChip>
                        <span class="font-weight-bold text-body-1">{{ child.departmentName }}</span>
                        <span class="text-caption text-secondary font-mono">({{ child.departmentCode }})</span>
                      </div>
                      <div class="d-flex align-center ga-2">
                        <span v-if="child.headName" class="text-caption text-secondary">
                          Head: <strong>{{ child.headName }}</strong>
                        </span>
                        <VChip size="x-small" color="primary" variant="tonal">
                          {{ child.employeeCount }} Staff
                        </VChip>
                      </div>
                    </div>
                  </VExpansionPanelTitle>

                  <VExpansionPanelText class="pa-3 bg-surface">
                    <!-- Position Hierarchy of Child -->
                    <div v-if="child.positionHierarchy?.length" class="mb-4">
                      <div class="d-flex flex-column ga-2">
                        <div
                          v-for="group in child.positionHierarchy"
                          :key="group.positionTitle"
                          class="pa-2 border rounded bg-white"
                        >
                          <div class="d-flex align-center ga-2 mb-1">
                            <VChip
                              size="x-small"
                              :color="getRankBadgeColor(group.positionTitle)"
                              variant="flat"
                            >
                              {{ group.positionTitle }}
                            </VChip>
                            <span class="text-caption text-secondary">({{ group.count }})</span>
                          </div>

                          <div class="d-flex flex-wrap ga-2">
                            <div
                              v-for="emp in group.members"
                              :key="emp.id"
                              class="pa-2 border rounded d-flex align-center justify-space-between ga-2 bg-surface"
                              style="min-width: 240px; flex: 1 1 240px"
                            >
                              <div>
                                <span class="font-weight-medium text-body-2 d-block">{{
                                  emp.fullName
                                }}</span>
                                <span class="text-caption text-secondary font-mono">{{
                                  emp.employeeCode
                                }}</span>
                              </div>
                              <VBtn
                                size="x-small"
                                variant="text"
                                color="primary"
                                icon="mdi-account-circle"
                                :to="`/hris/employees/${emp.id}`"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Level 3 Units -->
                    <div v-if="child.children?.length" class="mt-2 pt-2 border-t">
                      <div class="text-caption font-weight-bold text-secondary mb-1">
                        UNIT KERJA:
                      </div>
                      <div
                        v-for="unit in child.children"
                        :key="unit.id"
                        class="pa-2 border rounded mb-1 bg-white d-flex align-center justify-space-between"
                      >
                        <div>
                          <span class="font-weight-bold text-body-2">{{
                            unit.departmentName
                          }}</span>
                          <span class="text-caption text-secondary font-mono ml-2">({{ unit.departmentCode }})</span>
                        </div>
                        <VChip size="x-small" variant="outlined">
                          {{ unit.employeeCount }} orang
                        </VChip>
                      </div>
                    </div>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </div>

    <div v-else class="text-center py-8 text-secondary">
      Tidak ada data departemen atau jabatan yang cocok dengan pencarian.
    </div>
  </div>
</template>
