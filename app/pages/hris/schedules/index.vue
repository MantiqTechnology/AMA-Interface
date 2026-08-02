<script setup lang="ts">
const { data: shiftData, refresh: refreshShifts } = await useAsyncData('shift-patterns', () =>
  fetchApi<any[]>('/api/hris/schedules/shifts')
);

const { data: schedData, refresh: refreshSchedules } = await useAsyncData('crew-schedules', () =>
  fetchApi<any[]>('/api/hris/schedules/crew')
);

const { data: employeesData } = await useAsyncData('active-employees-schedules', () =>
  fetchApi<any[]>('/api/hris/employees?status=ACTIVE')
);

const { data: departmentsData } = await useAsyncData('schedules-departments', () =>
  fetchApi<any[]>('/api/hris/departments')
);

const shifts = computed(() => shiftData.value ?? []);
const schedules = computed(() => schedData.value ?? []);
const employeesList = computed(() => {
  if (Array.isArray(employeesData.value)) return employeesData.value;
  if (employeesData.value && Array.isArray((employeesData.value as any).items))
    return (employeesData.value as any).items;
  return [];
});
const departmentsList = computed(() => departmentsData.value ?? []);

// Master Shift Filter & Table Search
const shiftRosterFilter = ref<string>('ALL');
const crewSearchQuery = ref('');
const crewRosterFilter = ref<string>('ALL');

const filteredShifts = computed(() => {
  if (shiftRosterFilter.value === 'ALL') return shifts.value;
  return shifts.value.filter((s: any) => s.rosterType === shiftRosterFilter.value);
});

const filteredSchedules = computed(() => {
  return schedules.value.filter((item: any) => {
    const matchesRoster =
      crewRosterFilter.value === 'ALL' || item.rosterType === crewRosterFilter.value;
    const query = crewSearchQuery.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.employeeName?.toLowerCase().includes(query) ||
      item.employeeCode?.toLowerCase().includes(query) ||
      item.positionTitle?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query);

    return matchesRoster && matchesSearch;
  });
});

const headers = [
  { title: 'Tanggal', key: 'scheduleDate' },
  { title: 'Karyawan / Crew', key: 'employeeName' },
  { title: 'Stasiun', key: 'stationCode' },
  { title: 'Tipe Roster', key: 'rosterType' },
  { title: 'Shift', key: 'shiftName' },
  { title: 'Penerbangan', key: 'flightNumber' },
  { title: 'Catatan / Alasan Ganti', key: 'notes' },
  { title: 'Status', key: 'status' },
  { title: 'Aksi Ganti Shift', key: 'actions', sortable: false }
];

// Master Shift Dialog (CRUD)
const shiftDialog = ref(false);
const editingShiftId = ref<string | null>(null);
const shiftForm = ref({
  shiftCode: '',
  shiftName: '',
  rosterType: 'SHIFT',
  startTime: '08:00',
  endTime: '17:00',
  breakDurationMinutes: 60,
  isNightShift: false,
  colorCode: '#1976D2'
});
const savingShift = ref(false);

function openNewShiftDialog() {
  editingShiftId.value = null;
  shiftForm.value = {
    shiftCode: '',
    shiftName: '',
    rosterType: 'SHIFT',
    startTime: '08:00',
    endTime: '17:00',
    breakDurationMinutes: 60,
    isNightShift: false,
    colorCode: '#1976D2'
  };
  shiftDialog.value = true;
}

function openEditShiftDialog(shiftItem: any) {
  editingShiftId.value = shiftItem.id;
  shiftForm.value = {
    shiftCode: shiftItem.shiftCode,
    shiftName: shiftItem.shiftName,
    rosterType: shiftItem.rosterType || 'SHIFT',
    startTime: shiftItem.startTime,
    endTime: shiftItem.endTime,
    breakDurationMinutes: shiftItem.breakDurationMinutes || 60,
    isNightShift: Boolean(shiftItem.isNightShift),
    colorCode: shiftItem.colorCode || '#1976D2'
  };
  shiftDialog.value = true;
}

function generateAutoShiftCode() {
  const rosterPrefix =
    shiftForm.value.rosterType === 'FLIGHT_DUTY'
      ? 'FLT'
      : shiftForm.value.rosterType === 'STANDBY'
        ? 'STB'
        : shiftForm.value.rosterType === 'OFF'
          ? 'OFF'
          : shiftForm.value.rosterType === 'TRAINING'
            ? 'TRN'
            : 'SFT';

  let nameSlug = shiftForm.value.shiftName
    ? shiftForm.value.shiftName
        .split(' ')
        .map((w: string) => w.slice(0, 3).toUpperCase())
        .join('-')
        .slice(0, 8)
    : 'GEN';

  const randomNum = Math.floor(10 + Math.random() * 90);
  shiftForm.value.shiftCode = `${rosterPrefix}-${nameSlug}-${randomNum}`;
}

async function handleSaveShift() {
  if (!shiftForm.value.shiftCode || !shiftForm.value.shiftCode.trim()) {
    generateAutoShiftCode();
  }
  if (!shiftForm.value.shiftName || !shiftForm.value.shiftName.trim()) {
    alert('Nama Shift wajib diisi.');
    return;
  }
  savingShift.value = true;
  try {
    if (editingShiftId.value) {
      await fetchApi(`/api/hris/schedules/shifts/${editingShiftId.value}`, {
        method: 'PUT',
        body: shiftForm.value
      });
    } else {
      await fetchApi('/api/hris/schedules/shifts', {
        method: 'POST',
        body: shiftForm.value
      });
    }
    shiftDialog.value = false;
    refreshShifts();
  } catch (err: any) {
    alert(err.message || 'Gagal menyimpan data master shift.');
  } finally {
    savingShift.value = false;
  }
}

async function handleDeleteShift(shiftItem: any) {
  if (!confirm(`Hapus master shift "${shiftItem.shiftName}" (${shiftItem.shiftCode})?`)) return;
  try {
    await fetchApi(`/api/hris/schedules/shifts/${shiftItem.id}`, { method: 'DELETE' });
    refreshShifts();
  } catch (err: any) {
    alert(err.message || 'Gagal menghapus master shift.');
  }
}

// Employee Shift Assignment / Change Dialog (Multi-Employee & Department Filter)
const changeShiftDialog = ref(false);
const editingScheduleId = ref<string | null>(null);
const assignDepartmentFilter = ref<string>('ALL');
const assignEmployeeSearch = ref('');
const selectedAssignEmployeeIds = ref<string[]>([]);

const assignForm = ref({
  scheduleDate: new Date().toISOString().slice(0, 10),
  rosterType: 'SHIFT',
  shiftId: '',
  notes: ''
});
const savingAssign = ref(false);

const filteredModalEmployees = computed(() => {
  return employeesList.value.filter((emp: any) => {
    const matchesDept =
      assignDepartmentFilter.value === 'ALL' ||
      emp.departmentId === assignDepartmentFilter.value ||
      emp.departmentName === assignDepartmentFilter.value;

    const query = assignEmployeeSearch.value.toLowerCase().trim();
    const matchesSearch =
      !query ||
      emp.fullName?.toLowerCase().includes(query) ||
      emp.employeeCode?.toLowerCase().includes(query) ||
      emp.positionTitle?.toLowerCase().includes(query);

    return matchesDept && matchesSearch;
  });
});

function toggleAssignEmployeeSelection(empId: string) {
  if (selectedAssignEmployeeIds.value.includes(empId)) {
    selectedAssignEmployeeIds.value = selectedAssignEmployeeIds.value.filter((id) => id !== empId);
  } else {
    selectedAssignEmployeeIds.value.push(empId);
  }
}

function toggleSelectAllFiltered() {
  const filteredIds: string[] = filteredModalEmployees.value.map((e: any) => e.id);
  const allSelected = filteredIds.every((id: string) =>
    selectedAssignEmployeeIds.value.includes(id)
  );

  if (allSelected) {
    selectedAssignEmployeeIds.value = selectedAssignEmployeeIds.value.filter(
      (id: string) => !filteredIds.includes(id)
    );
  } else {
    const newSet = new Set<string>([...selectedAssignEmployeeIds.value, ...filteredIds]);
    selectedAssignEmployeeIds.value = Array.from(newSet);
  }
}

function deselectAll() {
  selectedAssignEmployeeIds.value = [];
}

function openAssignShiftDialog() {
  editingScheduleId.value = null;
  assignDepartmentFilter.value = 'ALL';
  assignEmployeeSearch.value = '';
  selectedAssignEmployeeIds.value = employeesList.value.map((e: any) => e.id);
  assignForm.value = {
    scheduleDate: new Date().toISOString().slice(0, 10),
    rosterType: 'SHIFT',
    shiftId: shifts.value[0]?.id || '',
    notes: ''
  };
  changeShiftDialog.value = true;
}

function openChangeEmployeeShift(item: any) {
  editingScheduleId.value = item.id;
  assignDepartmentFilter.value = 'ALL';
  assignEmployeeSearch.value = '';
  selectedAssignEmployeeIds.value = [item.employeeId];
  assignForm.value = {
    scheduleDate: item.scheduleDate,
    rosterType: item.rosterType || 'SHIFT',
    shiftId: item.shiftId || '',
    notes: item.notes || 'Permintaan ganti shift karyawan'
  };
  changeShiftDialog.value = true;
}

async function handleSaveEmployeeShift() {
  if (selectedAssignEmployeeIds.value.length === 0) {
    alert('Silakan pilih minimal 1 karyawan untuk diapplikasikan shift.');
    return;
  }
  if (!assignForm.value.scheduleDate) {
    alert('Silakan tentukan tanggal jadwal.');
    return;
  }

  savingAssign.value = true;
  try {
    await fetchApi('/api/hris/schedules/crew', {
      method: 'POST',
      body: {
        employeeIds: selectedAssignEmployeeIds.value,
        scheduleDate: assignForm.value.scheduleDate,
        shiftId: assignForm.value.shiftId || null,
        rosterType: assignForm.value.rosterType,
        notes: assignForm.value.notes
      }
    });
    changeShiftDialog.value = false;
    refreshSchedules();
  } catch (err: any) {
    alert(err.message || 'Gagal mengubah shift karyawan.');
  } finally {
    savingAssign.value = false;
  }
}

async function handleDeleteSchedule(item: any) {
  if (!confirm(`Hapus jadwal shift ${item.employeeName} pada tanggal ${item.scheduleDate}?`))
    return;
  try {
    await fetchApi(`/api/hris/schedules/crew/${item.id}`, { method: 'DELETE' });
    refreshSchedules();
  } catch (err: any) {
    alert(err.message || 'Gagal menghapus jadwal karyawan.');
  }
}

function refreshAll() {
  refreshShifts();
  refreshSchedules();
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-primary">Penjadwalan Shift & Roster Crew</h1>
        <p class="text-subtitle-1 text-secondary">
          Pengaturan master shift per tipe roster dan multi-employee shift assignment / tukar shift
          karyawan PT. AMA
        </p>
      </div>
      <div class="d-flex ga-2">
        <VBtn prepend-icon="mdi-clock-plus-outline" color="primary" @click="openNewShiftDialog()">
          Master Shift Baru
        </VBtn>
        <VBtn
          prepend-icon="mdi-account-switch-outline"
          color="success"
          @click="openAssignShiftDialog()"
        >
          Assign / Ganti Shift
        </VBtn>

        <VBtn
          prepend-icon="mdi-airplane-clock"
          variant="outlined"
          to="/hris/schedules/flight-roster"
        >
          Roster Penerbangan
        </VBtn>
        <VBtn prepend-icon="mdi-refresh" variant="text" @click="refreshAll()">Refresh</VBtn>
      </div>
    </div>

    <!-- Master Shift Patterns per Roster Type -->
    <VCard border class="mb-6 pa-4">
      <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
        <div class="d-flex align-center ga-2">
          <VIcon color="primary" icon="mdi-clock-outline" size="24" />
          <span class="text-h6 font-weight-bold">Master Pola Shift per Tipe Roster</span>
        </div>

        <VBtnToggle
          v-model="shiftRosterFilter"
          mandatory
          density="compact"
          color="primary"
          variant="outlined"
        >
          <VBtn value="ALL">Semua Roster</VBtn>
          <VBtn value="SHIFT">Shift Biasa</VBtn>
          <VBtn value="FLIGHT_DUTY">Flight Duty</VBtn>
          <VBtn value="STANDBY">Standby</VBtn>
          <VBtn value="OFF">Off / Libur</VBtn>
        </VBtnToggle>
      </div>

      <VDivider class="mb-4" />

      <VRow>
        <VCol v-for="s in filteredShifts" :key="s.id" cols="12" sm="6" md="3">
          <VCard border class="pa-3 position-relative" variant="outlined">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="font-weight-bold">{{ s.shiftName }}</span>
              <VChip
                size="x-small"
                :style="{ backgroundColor: s.colorCode || '#1976D2', color: '#fff' }"
                class="font-weight-bold"
              >
                {{ s.shiftCode }}
              </VChip>
            </div>
            <div class="text-caption text-secondary mb-1">
              Tipe: <VChip size="x-small" variant="tonal" color="primary">{{ s.rosterType }}</VChip>
            </div>
            <div class="text-h6 font-mono text-primary">{{ s.startTime }} - {{ s.endTime }}</div>
            <div class="text-caption text-secondary mt-1 d-flex align-center justify-space-between">
              <span>Istirahat: {{ s.breakDurationMinutes }} mnt</span>
              <span v-if="s.isNightShift" class="text-purple font-weight-bold">Night Shift</span>
            </div>

            <VDivider class="my-2" />

            <div class="d-flex justify-end ga-1">
              <VBtn
                size="x-small"
                variant="text"
                color="primary"
                icon="mdi-pencil"
                @click="openEditShiftDialog(s)"
              />
              <VBtn
                size="x-small"
                variant="text"
                color="error"
                icon="mdi-delete"
                @click="handleDeleteShift(s)"
              />
            </div>
          </VCard>
        </VCol>
        <VCol v-if="filteredShifts.length === 0" cols="12">
          <div class="text-center text-secondary py-4">
            Belum ada master shift untuk tipe roster ini.
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- Crew Schedules & Shift Exchange Table -->
    <VCard border>
      <VCardTitle
        class="pa-4 font-weight-bold text-h6 d-flex align-center justify-space-between flex-wrap ga-2"
      >
        <div>
          <span>Jadwal Crew & Perubahan Shift Karyawan</span>
          <div class="text-caption text-secondary font-weight-regular mt-1">
            Ubah atau ganti shift karyawan secara instan jika karyawan mengajukan tukar shift
          </div>
        </div>

        <div class="d-flex ga-2 align-center flex-grow-1" style="max-width: 500px">
          <VTextField
            v-model="crewSearchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Cari nama crew, NIP, alasan ganti shift..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
          <VSelect
            v-model="crewRosterFilter"
            :items="[
              { title: 'Semua Roster', value: 'ALL' },
              { title: 'Shift', value: 'SHIFT' },
              { title: 'Flight Duty', value: 'FLIGHT_DUTY' },
              { title: 'Standby', value: 'STANDBY' },
              { title: 'Rest Day / Off', value: 'REST_DAY' }
            ]"
            variant="outlined"
            density="compact"
            hide-details
            style="min-width: 160px"
          />
        </div>
      </VCardTitle>

      <VDivider />

      <VDataTable :headers="headers" :items="filteredSchedules">
        <template #item.scheduleDate="{ item }">
          <span class="font-weight-bold">{{ item.scheduleDate }}</span>
        </template>

        <template #item.employeeName="{ item }">
          <div class="font-weight-medium">{{ item.employeeName }}</div>
          <div class="text-caption text-secondary">
            {{ item.positionTitle }} • {{ item.employeeCode }}
          </div>
        </template>

        <template #item.stationCode="{ item }">
          <VChip size="small" variant="outlined">{{ item.stationCode || 'HQ' }}</VChip>
        </template>

        <template #item.rosterType="{ item }">
          <VChip size="small" color="info" variant="tonal">{{ item.rosterType }}</VChip>
        </template>

        <template #item.shiftName="{ item }">
          <div>
            <span class="font-weight-bold text-primary">{{
              item.shiftName || 'Custom Shift'
            }}</span>
            <div v-if="item.startTime" class="text-caption font-mono text-secondary">
              {{ item.startTime }} - {{ item.endTime }}
            </div>
          </div>
        </template>

        <template #item.flightNumber="{ item }">
          <span v-if="item.flightNumber" class="font-mono font-weight-bold text-primary">
            <VIcon icon="mdi-airplane" size="14" class="mr-1" />{{ item.flightNumber }}
          </span>
          <span v-else class="text-secondary">—</span>
        </template>

        <template #item.notes="{ item }">
          <span class="text-caption text-secondary">{{ item.notes || '—' }}</span>
        </template>

        <template #item.status="{ item }">
          <VChip size="small" color="success" variant="flat">{{ item.status }}</VChip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <VBtn
              size="small"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-account-switch"
              title="Ganti / Edit Shift Karyawan Ini"
              @click="openChangeEmployeeShift(item)"
            >
              Ganti Shift
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              color="error"
              icon="mdi-delete"
              title="Hapus Jadwal"
              @click="handleDeleteSchedule(item)"
            />
          </div>
        </template>
      </VDataTable>
    </VCard>

    <!-- Modal 1: Master Shift Form (Create / Edit) -->
    <VDialog v-model="shiftDialog" max-width="500">
      <VCard :title="editingShiftId ? 'Edit Master Pola Shift' : 'Tambah Master Pola Shift Baru'">
        <VDivider />
        <VCardText class="pa-4">
          <VRow>
            <VCol cols="6">
              <VTextField
                v-model="shiftForm.shiftCode"
                label="Kode Shift *"
                placeholder="FLT-AM, MNT-NS..."
                variant="outlined"
                append-inner-icon="mdi-auto-fix"
                title="Auto Generate Kode Shift"
                :rules="[
                  (v: string) => !!(v && v.trim()) || 'Kode shift wajib diisi / auto generate!'
                ]"
                @click:append-inner="generateAutoShiftCode()"
              />
            </VCol>
            <VCol cols="6">
              <VSelect
                v-model="shiftForm.rosterType"
                label="Tipe Roster"
                :items="['SHIFT', 'FLIGHT_DUTY', 'STANDBY', 'REST_DAY', 'TRAINING', 'OFF']"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="shiftForm.shiftName"
                label="Nama Shift"
                placeholder="Morning Flight Duty, Standby HQ..."
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model="shiftForm.startTime"
                label="Jam Mulai"
                type="time"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model="shiftForm.endTime"
                label="Jam Selesai"
                type="time"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model.number="shiftForm.breakDurationMinutes"
                label="Istirahat (Menit)"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol cols="6">
              <VTextField
                v-model="shiftForm.colorCode"
                label="Warna Badge Badge (Hex)"
                placeholder="#1976D2"
                variant="outlined"
              />
            </VCol>
            <VCol cols="12">
              <VSwitch
                v-model="shiftForm.isNightShift"
                label="Shift Malam (Night Shift)"
                color="purple"
                hide-details
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="shiftDialog = false">Batal</VBtn>
          <VBtn color="primary" :loading="savingShift" @click="handleSaveShift()">
            Simpan Master Shift
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Modal 2: Multi-Employee Shift Assignment & Swap -->
    <VDialog v-model="changeShiftDialog" max-width="700" scrollable>
      <VCard>
        <VCardTitle class="pa-4 font-weight-bold text-h6 d-flex align-center justify-space-between">
          <div>
            <span>{{
              editingScheduleId ? 'Ganti / Ubah Shift Karyawan' : 'Assign Multi-Employee Shift'
            }}</span>
            <div class="text-caption text-secondary font-weight-regular mt-1">
              Pilih karyawan dan pola shift untuk diapplikasikan pada tanggal jadwal
            </div>
          </div>
          <VChip color="primary" variant="flat" size="medium">
            {{ selectedAssignEmployeeIds.length }} / {{ employeesList.length }} Terpilih
          </VChip>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-4">
          <!-- Step 1: Configuration -->
          <VRow class="mb-2">
            <VCol cols="6" sm="4">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">TANGGAL SHIFT *</label>
              <VTextField
                v-model="assignForm.scheduleDate"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              />
            </VCol>

            <VCol cols="6" sm="4">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">TIPE ROSTER</label>
              <VSelect
                v-model="assignForm.rosterType"
                :items="['SHIFT', 'FLIGHT_DUTY', 'STANDBY', 'REST_DAY', 'TRAINING', 'OFF']"
                variant="outlined"
                density="compact"
                hide-details
              />
            </VCol>

            <VCol cols="12" sm="4">
              <label class="text-caption font-weight-bold text-secondary mb-1 d-block">POLA SHIFT *</label>
              <VSelect
                v-model="assignForm.shiftId"
                :items="shifts"
                item-title="shiftName"
                item-value="id"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="Pilih shift..."
              />
            </VCol>
          </VRow>

          <VDivider class="my-4" />

          <!-- Step 2: Department & Employee Multi-Select -->
          <div class="d-flex align-center justify-space-between mb-3 ga-2 flex-wrap">
            <div class="d-flex ga-2 align-center flex-grow-1" style="max-width: 480px">
              <VSelect
                v-model="assignDepartmentFilter"
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
                v-model="assignEmployeeSearch"
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
                @click="toggleSelectAllFiltered()"
              >
                Pilih Semua Filtered
              </VBtn>
              <VBtn size="small" variant="text" color="error" @click="deselectAll()">
                Deselect
              </VBtn>
            </div>
          </div>

          <!-- Checklist Employee Table -->
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
                  v-for="emp in filteredModalEmployees"
                  :key="emp.id"
                  :class="{ 'bg-primary-lighten-5': selectedAssignEmployeeIds.includes(emp.id) }"
                  style="cursor: pointer"
                  @click="toggleAssignEmployeeSelection(emp.id)"
                >
                  <td>
                    <VCheckboxBtn
                      :model-value="selectedAssignEmployeeIds.includes(emp.id)"
                      color="primary"
                      density="compact"
                      @click.stop="toggleAssignEmployeeSelection(emp.id)"
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
                <tr v-if="filteredModalEmployees.length === 0">
                  <td colspan="4" class="text-center text-secondary py-4">
                    Tidak ada karyawan yang cocok dengan filter departemen atau pencarian.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <VTextarea
            v-model="assignForm.notes"
            label="Catatan / Alasan Perubahan Shift"
            placeholder="Permintaan tukar shift karyawan, penyesuaian roster penerbangan..."
            rows="2"
            variant="outlined"
            density="compact"
            hide-details
          />
        </VCardText>
        <VDivider />
        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn variant="text" @click="changeShiftDialog = false">Batal</VBtn>
          <VBtn
            color="primary"
            prepend-icon="mdi-check"
            :loading="savingAssign"
            :disabled="selectedAssignEmployeeIds.length === 0"
            @click="handleSaveEmployeeShift()"
          >
            Simpan & Assign Shift ({{ selectedAssignEmployeeIds.length }})
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
