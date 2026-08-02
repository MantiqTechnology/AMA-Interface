<script setup lang="ts">
const activeTab = ref<'assessments' | 'templates'>('assessments');

const { data: periodData } = await useAsyncData('kpi-periods', () =>
  fetchApi<any[]>('/api/hris/kpi/periods')
);
const periods = computed(() => periodData.value ?? []);

const { data: departmentsData } = await useAsyncData('kpi-departments', () =>
  fetchApi<any[]>('/api/hris/departments')
);
const departmentsList = computed(() => departmentsData.value ?? []);

const { data: employeesData } = await useAsyncData('kpi-active-employees', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);
const employeesList = computed(() => {
  if (Array.isArray(employeesData.value)) return employeesData.value;
  if (employeesData.value && Array.isArray((employeesData.value as any).items))
    return (employeesData.value as any).items;
  return [];
});

const selectedPeriod = ref<string | null>(null);
const departmentFilter = ref<string>('ALL');
const searchQuery = ref('');

watch(
  periods,
  (val) => {
    if (val?.length && !selectedPeriod.value) {
      selectedPeriod.value = val[0].id;
    }
  },
  { immediate: true }
);

// Assessments Data
const { data: assessData, refresh: refreshAssessments } = await useAsyncData(
  'kpi-assessments',
  () =>
    fetchApi<any[]>('/api/hris/kpi/assessments', {
      params: {
        periodId: selectedPeriod.value || undefined,
        departmentId: departmentFilter.value !== 'ALL' ? departmentFilter.value : undefined
      }
    }),
  { watch: [selectedPeriod, departmentFilter] }
);
const assessments = computed(() => assessData.value ?? []);

const filteredAssessments = computed(() => {
  return assessments.value.filter((item: any) => {
    const query = searchQuery.value.toLowerCase().trim();
    return (
      !query ||
      item.employeeName?.toLowerCase().includes(query) ||
      item.employeeCode?.toLowerCase().includes(query) ||
      item.positionTitle?.toLowerCase().includes(query) ||
      item.templateName?.toLowerCase().includes(query)
    );
  });
});

// Master Templates Data
const { data: templatesData, refresh: refreshTemplates } = await useAsyncData('kpi-templates', () =>
  fetchApi<any[]>('/api/hris/kpi/templates')
);
const templates = computed(() => templatesData.value ?? []);

const filteredTemplates = computed(() => {
  if (departmentFilter.value === 'ALL') return templates.value;
  return templates.value.filter(
    (t: any) => !t.departmentId || t.departmentId === departmentFilter.value
  );
});

const headers = [
  { title: 'Karyawan', key: 'employeeName' },
  { title: 'Departemen & Jabatan', key: 'departmentName' },
  { title: 'KPI Template', key: 'templateName' },
  { title: 'Penilai / Assessor', key: 'assessorName' },
  { title: 'Skor Akhir', key: 'overallScore' },
  { title: 'Grade', key: 'overallGrade' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi', key: 'actions', sortable: false }
];

function gradeColor(g: string) {
  if (g === 'A') return 'success';
  if (g === 'B') return 'info';
  if (g === 'C') return 'warning';
  return 'error';
}

// Modal 1: Master KPI Template CRUD
const templateDialog = ref(false);
const editingTemplateId = ref<string | null>(null);
const templateForm = ref({
  templateName: '',
  departmentId: '' as string | null,
  indicators: [
    {
      indicatorName: 'Pencapaian Target Kerja / Target Realization',
      weight: 40,
      targetValue: '100%',
      unit: '%'
    },
    {
      indicatorName: 'Kedisiplinan & Presensi / Attendance',
      weight: 30,
      targetValue: '95%',
      unit: '%'
    },
    {
      indicatorName: 'Kepatuhan Prosedur Keselamatan & SOP',
      weight: 30,
      targetValue: '100%',
      unit: '%'
    }
  ]
});
const savingTemplate = ref(false);

function openNewTemplateDialog() {
  editingTemplateId.value = null;
  templateForm.value = {
    templateName: '',
    departmentId: departmentsList.value[0]?.id || null,
    indicators: [
      {
        indicatorName: 'Pencapaian Target Kerja / Target Realization',
        weight: 40,
        targetValue: '100%',
        unit: '%'
      },
      {
        indicatorName: 'Kedisiplinan & Presensi / Attendance',
        weight: 30,
        targetValue: '95%',
        unit: '%'
      },
      {
        indicatorName: 'Kepatuhan Prosedur Keselamatan & SOP',
        weight: 30,
        targetValue: '100%',
        unit: '%'
      }
    ]
  };
  templateDialog.value = true;
}

function openEditTemplateDialog(tpl: any) {
  editingTemplateId.value = tpl.id;
  templateForm.value = {
    templateName: tpl.templateName,
    departmentId: tpl.departmentId || null,
    indicators:
      tpl.indicators && tpl.indicators.length
        ? tpl.indicators.map((ind: any) => ({
            indicatorName: ind.indicatorName,
            weight: ind.weight,
            targetValue: ind.targetValue || '',
            unit: ind.unit || ''
          }))
        : [{ indicatorName: '', weight: 0, targetValue: '', unit: '' }]
  };
  templateDialog.value = true;
}

function addIndicatorRow() {
  templateForm.value.indicators.push({ indicatorName: '', weight: 0, targetValue: '', unit: '' });
}

function removeIndicatorRow(index: number) {
  templateForm.value.indicators.splice(index, 1);
}

async function handleSaveTemplate() {
  if (!templateForm.value.templateName || !templateForm.value.templateName.trim()) {
    alert('Nama KPI Template wajib diisi.');
    return;
  }
  savingTemplate.value = true;
  try {
    if (editingTemplateId.value) {
      await fetchApi(`/api/hris/kpi/templates/${editingTemplateId.value}`, {
        method: 'PUT',
        body: templateForm.value
      });
    } else {
      await fetchApi('/api/hris/kpi/templates', {
        method: 'POST',
        body: templateForm.value
      });
    }
    templateDialog.value = false;
    refreshTemplates();
  } catch (err: any) {
    alert(err.message || 'Gagal menyimpan Master Template KPI.');
  } finally {
    savingTemplate.value = false;
  }
}

async function handleDeleteTemplate(tpl: any) {
  if (!confirm(`Nonaktifkan Master Template KPI "${tpl.templateName}"?`)) return;
  try {
    await fetchApi(`/api/hris/kpi/templates/${tpl.id}`, { method: 'DELETE' });
    refreshTemplates();
  } catch (err: any) {
    alert(err.message || 'Gagal menghapus template KPI.');
  }
}

// Modal 2: Assign & Multi-Assign KPI to Employees
const assignDialog = ref(false);
const assignDeptFilter = ref<string>('ALL');
const assignSearchQuery = ref('');
const selectedAssignEmpIds = ref<string[]>([]);
const assignForm = ref({
  periodId: '',
  templateId: '',
  assessorId: '' as string | null,
  notes: ''
});
const savingAssign = ref(false);

const filteredAssignEmployees = computed(() => {
  return employeesList.value.filter((emp: any) => {
    const matchesDept =
      assignDeptFilter.value === 'ALL' ||
      emp.departmentId === assignDeptFilter.value ||
      emp.departmentName === assignDeptFilter.value;

    const query = assignSearchQuery.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      emp.fullName?.toLowerCase().includes(query) ||
      emp.employeeCode?.toLowerCase().includes(query) ||
      emp.positionTitle?.toLowerCase().includes(query);

    return matchesDept && matchesSearch;
  });
});

function toggleAssignEmpSelection(empId: string) {
  if (selectedAssignEmpIds.value.includes(empId)) {
    selectedAssignEmpIds.value = selectedAssignEmpIds.value.filter((id) => id !== empId);
  } else {
    selectedAssignEmpIds.value.push(empId);
  }
}

function selectAllFilteredAssign() {
  const filteredIds: string[] = filteredAssignEmployees.value.map((e: any) => e.id);
  const allSelected = filteredIds.every((id: string) => selectedAssignEmpIds.value.includes(id));

  if (allSelected) {
    selectedAssignEmpIds.value = selectedAssignEmpIds.value.filter(
      (id: string) => !filteredIds.includes(id)
    );
  } else {
    const newSet = new Set<string>([...selectedAssignEmpIds.value, ...filteredIds]);
    selectedAssignEmpIds.value = Array.from(newSet);
  }
}

function deselectAllAssign() {
  selectedAssignEmpIds.value = [];
}

function openAssignKpiDialog() {
  assignDeptFilter.value = 'ALL';
  assignSearchQuery.value = '';
  selectedAssignEmpIds.value = employeesList.value.map((e: any) => e.id);
  assignForm.value = {
    periodId: selectedPeriod.value || periods.value[0]?.id || '',
    templateId: templates.value[0]?.id || '',
    assessorId: null,
    notes: ''
  };
  assignDialog.value = true;
}

async function handleSaveAssignKpi() {
  if (selectedAssignEmpIds.value.length === 0) {
    alert('Silakan pilih minimal 1 karyawan untuk diapplikasikan KPI.');
    return;
  }
  if (!assignForm.value.periodId || !assignForm.value.templateId) {
    alert('Silakan pilih Periode Evaluasi dan Template KPI.');
    return;
  }

  savingAssign.value = true;
  try {
    await fetchApi('/api/hris/kpi/assessments', {
      method: 'POST',
      body: {
        periodId: assignForm.value.periodId,
        templateId: assignForm.value.templateId,
        employeeIds: selectedAssignEmpIds.value,
        assessorId: assignForm.value.assessorId || null,
        notes: assignForm.value.notes
      }
    });
    assignDialog.value = false;
    refreshAssessments();
  } catch (err: any) {
    alert(err.message || 'Gagal melakukan assign KPI karyawan.');
  } finally {
    savingAssign.value = false;
  }
}

// Modal 3: Review / Input Score Assessment
const evalDialog = ref(false);
const editingEvalId = ref<string | null>(null);
const evalForm = ref({
  employeeName: '',
  templateName: '',
  overallScore: 85,
  overallGrade: 'B',
  status: 'FINALIZED',
  notes: ''
});
const savingEval = ref(false);

function openEvalDialog(item: any) {
  editingEvalId.value = item.id;
  evalForm.value = {
    employeeName: item.employeeName,
    templateName: item.templateName,
    overallScore: item.overallScore || 85,
    overallGrade: item.overallGrade || 'B',
    status: item.status || 'FINALIZED',
    notes: item.notes || ''
  };
  evalDialog.value = true;
}

async function handleSaveEval() {
  if (!editingEvalId.value) return;
  savingEval.value = true;
  try {
    await fetchApi(`/api/hris/kpi/assessments/${editingEvalId.value}`, {
      method: 'PUT',
      body: {
        overallScore: evalForm.value.overallScore,
        overallGrade: evalForm.value.overallGrade,
        status: evalForm.value.status,
        notes: evalForm.value.notes
      }
    });
    evalDialog.value = false;
    refreshAssessments();
  } catch (err: any) {
    alert(err.message || 'Gagal memperbarui skor evaluasi KPI.');
  } finally {
    savingEval.value = false;
  }
}

async function handleDeleteAssessment(item: any) {
  if (!confirm(`Hapus penilaian KPI karyawan ${item.employeeName}?`)) return;
  try {
    await fetchApi(`/api/hris/kpi/assessments/${item.id}`, { method: 'DELETE' });
    refreshAssessments();
  } catch (err: any) {
    alert(err.message || 'Gagal menghapus penilaian KPI.');
  }
}

function refreshAll() {
  refreshAssessments();
  refreshTemplates();
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Evaluasi & Manajemen KPI Karyawan</h1>
        <p class="text-subtitle-1 text-secondary">
          Pengaturan master template KPI, assign multi-karyawan per departemen, dan penilaian
          kinerja berkala PT. AMA
        </p>
      </div>

      <div class="d-flex ga-2">
        <VBtn
          prepend-icon="mdi-format-list-checks"
          color="primary"
          @click="openNewTemplateDialog()"
        >
          Master Template KPI Baru
        </VBtn>

        <VBtn prepend-icon="mdi-account-plus" color="success" @click="openAssignKpiDialog()">
          Assign KPI Karyawan
        </VBtn>

        <VBtn prepend-icon="mdi-refresh" variant="outlined" @click="refreshAll()">
          Refresh Data
        </VBtn>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <VTabs v-model="activeTab" color="primary" class="mb-4">
      <VTab value="assessments" prepend-icon="mdi-clipboard-text-clock-outline">
        Penilaian & Evaluation Karyawan
      </VTab>
      <VTab value="templates" prepend-icon="mdi-file-document-multiple-outline">
        Master Pola & Template KPI ({{ filteredTemplates.length }})
      </VTab>
    </VTabs>

    <!-- Tab 1: Assessments Table -->
    <div v-if="activeTab === 'assessments'">
      <!-- Filter Bar -->
      <VCard border class="pa-4 mb-4">
        <VRow>
          <VCol cols="12" sm="4">
            <VSelect
              v-model="selectedPeriod"
              density="compact"
              hide-details
              label="Periode Evaluasi KPI"
              :items="periods.map((p: any) => ({ title: p.periodName, value: p.id }))"
              variant="outlined"
            />
          </VCol>

          <VCol cols="12" sm="4">
            <VSelect
              v-model="departmentFilter"
              density="compact"
              hide-details
              label="Filter Departemen"
              :items="[
                { title: 'Semua Departemen', value: 'ALL' },
                ...departmentsList.map((d: any) => ({ title: d.departmentName, value: d.id }))
              ]"
              variant="outlined"
            />
          </VCol>

          <VCol cols="12" sm="4">
            <VTextField
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Cari nama karyawan, NIP, template..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </VCol>
        </VRow>
      </VCard>

      <!-- Assessments Table -->
      <VCard border elevation="1">
        <VDataTable :headers="headers" :items="filteredAssessments">
          <template #item.employeeName="{ item }">
            <div class="font-weight-bold text-body-1 text-primary">{{ item.employeeName }}</div>
            <div class="text-caption text-secondary font-mono">{{ item.employeeCode }}</div>
          </template>

          <template #item.departmentName="{ item }">
            <div>
              <VChip size="x-small" color="primary" variant="tonal">
                {{ item.departmentName || 'General' }}
              </VChip>
              <div class="text-caption text-secondary mt-1">{{ item.positionTitle }}</div>
            </div>
          </template>

          <template #item.templateName="{ item }">
            <VChip size="small" variant="outlined" color="primary" class="font-weight-medium">
              {{ item.templateName }}
            </VChip>
          </template>

          <template #item.assessorName="{ item }">
            <span class="text-body-2">{{ item.assessorName || 'Manager Direct' }}</span>
          </template>

          <template #item.overallScore="{ item }">
            <span class="font-weight-bold text-h6 text-primary">{{
              item.overallScore ?? '—'
            }}</span>
          </template>

          <template #item.overallGrade="{ item }">
            <VChip
              v-if="item.overallGrade"
              :color="gradeColor(item.overallGrade)"
              size="small"
              variant="flat"
            >
              Grade {{ item.overallGrade }}
            </VChip>
            <span v-else class="text-secondary">—</span>
          </template>

          <template #item.status="{ item }">
            <VChip size="small" color="info" variant="tonal">{{ item.status }}</VChip>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-1">
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-pencil"
                title="Input Skor & Evaluasi KPI"
                @click="openEvalDialog(item)"
              >
                Evaluasi
              </VBtn>
              <VBtn
                size="small"
                variant="text"
                color="error"
                icon="mdi-delete"
                title="Hapus Assessment"
                @click="handleDeleteAssessment(item)"
              />
            </div>
          </template>

          <template #no-data>
            <div class="text-center py-6 text-secondary">
              Belum ada data evaluasi KPI untuk periode atau departemen ini.
            </div>
          </template>
        </VDataTable>
      </VCard>
    </div>

    <!-- Tab 2: Master KPI Templates Grid (CRUD) -->
    <div v-else>
      <VCard border class="pa-4 mb-4">
        <div class="d-flex align-center justify-space-between flex-wrap ga-2">
          <div class="font-weight-bold text-h6">Daftar Master Template & Indikator KPI</div>
          <div style="max-width: 300px">
            <VSelect
              v-model="departmentFilter"
              density="compact"
              hide-details
              label="Filter Departemen"
              :items="[
                { title: 'Semua Departemen', value: 'ALL' },
                ...departmentsList.map((d: any) => ({ title: d.departmentName, value: d.id }))
              ]"
              variant="outlined"
            />
          </div>
        </div>
      </VCard>

      <VRow>
        <VCol v-for="tpl in filteredTemplates" :key="tpl.id" cols="12" md="6" lg="4">
          <VCard border class="pa-4 h-100 d-flex flex-column justify-space-between">
            <div>
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="font-weight-bold text-subtitle-1 text-primary">{{
                  tpl.templateName
                }}</span>
                <VChip size="x-small" variant="tonal" color="primary">
                  {{ tpl.departmentName || 'Semua Departemen' }}
                </VChip>
              </div>

              <VDivider class="my-2" />

              <div class="text-caption font-weight-bold text-secondary mb-2">
                INDIKATOR METRIK KPI:
              </div>
              <VList density="compact" class="pa-0 bg-transparent">
                <VListItem
                  v-for="(ind, idx) in tpl.indicators"
                  :key="ind.id || idx"
                  class="px-0 py-1"
                >
                  <template #prepend>
                    <VIcon icon="mdi-check-circle-outline" size="16" color="success" class="mr-2" />
                  </template>
                  <VListItemTitle class="text-body-2">
                    {{ ind.indicatorName }}
                  </VListItemTitle>
                  <template #append>
                    <VChip size="x-small" color="primary" variant="flat">
                      Bobot: {{ ind.weight }}%
                    </VChip>
                  </template>
                </VListItem>
              </VList>
            </div>

            <div class="mt-4 pt-2 border-t d-flex justify-end ga-2">
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                prepend-icon="mdi-pencil"
                @click="openEditTemplateDialog(tpl)"
              >
                Edit Template
              </VBtn>
              <VBtn
                size="small"
                variant="text"
                color="error"
                icon="mdi-delete"
                @click="handleDeleteTemplate(tpl)"
              />
            </div>
          </VCard>
        </VCol>

        <VCol v-if="filteredTemplates.length === 0" cols="12">
          <div class="text-center text-secondary py-6">
            Belum ada Master Template KPI untuk departemen ini. Silakan klik tombol "Master Template
            KPI Baru".
          </div>
        </VCol>
      </VRow>
    </div>

    <!-- Modal 1: Master KPI Template Form (Create / Edit) -->
    <VDialog v-model="templateDialog" max-width="650" scrollable>
      <VCard
        :title="editingTemplateId ? 'Edit Master Template KPI' : 'Tambah Master Template KPI Baru'"
      >
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12" sm="7">
              <VTextField
                v-model="templateForm.templateName"
                label="Nama KPI Template *"
                placeholder="KPI Flight Operations, KPI Engineering..."
                variant="outlined"
              />
            </VCol>

            <VCol cols="12" sm="5">
              <VSelect
                v-model="templateForm.departmentId"
                label="Departemen Target"
                :items="[
                  { title: 'Semua Departemen (Umum)', value: null },
                  ...departmentsList.map((d: any) => ({ title: d.departmentName, value: d.id }))
                ]"
                variant="outlined"
              />
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <div class="d-flex align-center justify-space-between mb-2">
            <span class="font-weight-bold text-subtitle-2">Daftar Indikator / Metrik Penilaian</span>
            <VBtn
              size="x-small"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-plus"
              @click="addIndicatorRow()"
            >
              Tambah Metrik
            </VBtn>
          </div>

          <div
            v-for="(ind, idx) in templateForm.indicators"
            :key="idx"
            class="pa-3 border rounded mb-2 bg-surface"
          >
            <VRow density="compact">
              <VCol cols="12" sm="6">
                <VTextField
                  v-model="ind.indicatorName"
                  label="Nama Indikator / Metrik *"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="4" sm="2">
                <VTextField
                  v-model.number="ind.weight"
                  label="Bobot %"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="4" sm="2">
                <VTextField
                  v-model="ind.targetValue"
                  label="Target"
                  placeholder="95%"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="4" sm="2" class="d-flex align-center">
                <VBtn
                  size="small"
                  color="error"
                  variant="text"
                  icon="mdi-close-circle"
                  @click="removeIndicatorRow(idx)"
                />
              </VCol>
            </VRow>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="templateDialog = false">Batal</VBtn>
          <VBtn color="primary" :loading="savingTemplate" @click="handleSaveTemplate()">
            Simpan Template KPI
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal 2: Multi-Employee KPI Assignment -->
    <VDialog v-model="assignDialog" max-width="700" scrollable>
      <VCard title="Assign Multi-Employee KPI Assessment">
        <VDivider />
        <VCardText class="pa-4">
          <!-- Step 1: Period & Template Select -->
          <VRow class="mb-2">
            <VCol cols="12" sm="6">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">PERIODE EVALUASI *</label>
              <VSelect
                v-model="assignForm.periodId"
                :items="periods.map((p: any) => ({ title: p.periodName, value: p.id }))"
                variant="outlined"
                density="compact"
                hide-details
              />
            </VCol>

            <VCol cols="12" sm="6">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">TEMPLATE KPI *</label>
              <VSelect
                v-model="assignForm.templateId"
                :items="templates.map((t: any) => ({ title: t.templateName, value: t.id }))"
                variant="outlined"
                density="compact"
                hide-details
              />
            </VCol>
          </VRow>

          <VDivider class="my-3" />

          <!-- Step 2: Department Filter & Multi Select -->
          <div class="d-flex align-center justify-space-between mb-3 ga-2 flex-wrap">
            <div class="d-flex ga-2 align-center flex-grow-1" style="max-width: 480px">
              <VSelect
                v-model="assignDeptFilter"
                label="Filter Departemen"
                :items="[
                  { title: 'Semua Departemen', value: 'ALL' },
                  ...departmentsList.map((d: any) => ({ title: d.departmentName, value: d.id }))
                ]"
                variant="outlined"
                density="compact"
                hide-details
                style="min-width: 180px"
              />
              <VTextField
                v-model="assignSearchQuery"
                prepend-inner-icon="mdi-magnify"
                placeholder="Cari nama staff / NIP..."
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </div>

            <div class="d-flex ga-2">
              <VBtn
                size="small"
                variant="outlined"
                color="primary"
                @click="selectAllFilteredAssign()"
              >
                Pilih Semua Filtered
              </VBtn>
              <VBtn size="small" variant="text" color="error" @click="deselectAllAssign()">
                Deselect
              </VBtn>
            </div>
          </div>

          <VCard border class="mb-4" max-height="250" style="overflow-y: auto">
            <VTable density="compact" hover>
              <thead>
                <tr>
                  <th style="width: 50px">Select</th>
                  <th>Nama Karyawan</th>
                  <th>Departemen</th>
                  <th>Jabatan</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="emp in filteredAssignEmployees"
                  :key="emp.id"
                  :class="{ 'bg-primary-lighten-5': selectedAssignEmpIds.includes(emp.id) }"
                  style="cursor: pointer"
                  @click="toggleAssignEmpSelection(emp.id)"
                >
                  <td>
                    <VCheckboxBtn
                      :model-value="selectedAssignEmpIds.includes(emp.id)"
                      color="primary"
                      density="compact"
                      @click.stop="toggleAssignEmpSelection(emp.id)"
                    />
                  </td>
                  <td>
                    <div class="font-weight-medium">{{ emp.fullName }}</div>
                    <div class="text-caption text-secondary">{{ emp.employeeCode }}</div>
                  </td>
                  <td>
                    <VChip size="x-small" variant="tonal" color="primary">
                      {{ emp.departmentName || 'General' }}
                    </VChip>
                  </td>
                  <td>
                    <span class="text-caption">{{ emp.positionTitle }}</span>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="assignDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-check"
            :loading="savingAssign"
            :disabled="selectedAssignEmpIds.length === 0"
            @click="handleSaveAssignKpi()"
          >
            Simpan & Assign KPI ({{ selectedAssignEmpIds.length }})
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal 3: Evaluation & Score Input -->
    <VDialog v-model="evalDialog" max-width="500">
      <VCard :title="`Evaluasi KPI: ${evalForm.employeeName}`">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="12">
              <div class="text-subtitle-2 text-secondary mb-1">
                Template: {{ evalForm.templateName }}
              </div>
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model.number="evalForm.overallScore"
                label="Skor Akhir (0-100)"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VSelect
                v-model="evalForm.overallGrade"
                label="Grade"
                :items="['A', 'B', 'C', 'D', 'E']"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VSelect
                v-model="evalForm.status"
                label="Status"
                :items="['DRAFT', 'SELF_ASSESSED', 'REVIEWED', 'FINALIZED']"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="evalForm.notes"
                label="Catatan Evaluasi Manager"
                rows="2"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="evalDialog = false">Batal</VBtn>
          <VBtn color="primary" :loading="savingEval" @click="handleSaveEval()">
            Simpan Skor KPI
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
